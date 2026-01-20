import { getMCPManager } from '@/core/mcpManager';
import File from '@/mysql/model/file.model';
import KrdGenTask from '@/mysql/model/gen_task.model';
import KrdGenTaskOutput from '@/mysql/model/gen_task_output.model';
import { IGenTaskOutputSer } from '@/types/genTaskOutput';
import { IGenTaskSer } from '@/types/genTask';
import { extractToolCallsFromText } from '@/utils/text';
import { config } from '@config/index'
import dns from 'node:dns';
import OpenAI from 'openai';
import { Op } from 'sequelize';
import { execute } from '../service/task.dispatch';
import { put, queryList } from '../utils/mapper';
import { getNextApiUrl } from '../utils/redis';
import { loadRagProcessor } from '@/service/loadRagProcessor';
import { loadCacheProcessor } from '@/service/loadCacheProcessor';
import {
  detectLanguage,
  formatSingleLanguageOutput,
  translateText,
  LanguageCode,
} from '@/utils/translation';

dns.setDefaultResultOrder('ipv4first');

const getChatModelName = () => {
  return (
    process.env.OLLAMA_MODEL ||
    (config as any)?.Models?.chatModel?.name ||
    (config as any)?.Ollama?.model ||
    'gpt-oss:20b'
  );
};

const getChatTitleModelName = () => {
  return (
    process.env.OLLAMA_TITLE_MODEL ||
    process.env.OLLAMA_MODEL ||
    (config as any)?.Models?.chatTitleGenModel?.name ||
    (config as any)?.Models?.chatModel?.name ||
    (config as any)?.Ollama?.model ||
    'gpt-oss:20b'
  );
};

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
});

const callLLM = async (messages: any[], temperature = 0.5, outputId?: number): Promise<string> => {
  try {
    if (outputId) {
      const url = await getNextApiUrl('ollama');
      const model = getChatModelName();
      
      console.log(`[LLM] Initializing LLM call with model: ${model}`);
      console.log(`[LLM] Ollama URL: ${url}`);
      console.log(`[LLM] Message count: ${messages.length}`);
      console.log(`[LLM] Temperature: ${temperature}`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        console.error(`[LLM] Request timeout after 120s, aborting`);
        controller.abort();
      }, 120000); // 120 second timeout
      
      const response = await fetch(`${url.replace(/\/+$/, '')}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stream: true, model, messages, options: { temperature, repeat_penalty: 1.5 } }),
        signal: controller.signal,
      });
      
      if (!response.ok) {
        clearTimeout(timeoutId);
        console.error(`[LLM] Ollama API error: ${response.status} ${response.statusText}`);
        const errorText = await response.text();
        console.error(`[LLM] Error details: ${errorText}`);
        throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
      }
      
      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let content = '';
      let buffer = '';
      let chunkCount = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          console.log(`[LLM] Stream complete. Total chunks: ${chunkCount}, content length: ${content.length}`);
          clearTimeout(timeoutId);
          break;
        }
        
        chunkCount++;
        let [curOutput] = await queryList(KrdGenTaskOutput, { id: { [Op.eq]: outputId } });
        if (!curOutput) {
          console.error(`[LLM] Output with ID ${outputId} not found.`);
          break;
        }
        if (curOutput.status === 'CANCEL') {
          console.log(`[LLM] Generation cancelled by user`);
          await reader.cancel().catch(() => { });
          await put<IGenTaskOutputSer>(
            KrdGenTaskOutput,
            { id: outputId },
            { status: 'CANCEL', update_by: 'JOB' },
          );
          clearTimeout(timeoutId);
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop()!;

        for (const line of lines) {
          [curOutput] = await queryList(KrdGenTaskOutput, { id: { [Op.eq]: outputId } });
          if (curOutput.status === 'CANCEL') {
            await reader.cancel().catch(() => { });
            content = '';
            await put<IGenTaskOutputSer>(
              KrdGenTaskOutput,
              { id: outputId },
              { content, status: 'CANCEL', update_by: 'JOB' },
            );
            break;
          }
          if (!line.trim()) continue;
          try {
            const pkg = JSON.parse(line);
            if (pkg.message && pkg.message.content) {
              const chunkText = pkg.message.content;
              content += chunkText;
              await put<IGenTaskOutputSer>(
                KrdGenTaskOutput,
                { id: outputId },
                { content, update_by: 'JOB' },
              );
            }
          } catch (e) {
            console.error('LLM stream parse error:', e);
          }
        }
      }
      return content || '';
    } else {
      const url = await getNextApiUrl('ollama');
      const model = getChatModelName();
      const response = await fetch(`${url.replace(/\/+$/, '')}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stream: false, model, messages, options: { temperature } }),
      });
      const res = await response.json();
      return res.message?.content || '';
    }
  } catch (error) {
    console.error('[LLM] callLLM error:', error);
    throw error;
  }
};

const generateWithLLM = async (messages: any[], outputId: number) => {
  try {
    console.log(`[generateWithLLM] Starting LLM generation for outputId: ${outputId}`);
    const result = await callLLM(messages, 0.1, outputId);
    console.log(`[generateWithLLM] LLM generation completed, result length: ${result?.length || 0}`);
    return result || 'error happen';
  } catch (error) {
    console.error('[generateWithLLM] LLM generation failed:', error);
    console.error('[generateWithLLM] Error type:', error instanceof Error ? error.message : String(error));
    return 'error happen';
  }
};

export async function createChatTitle(prompt: string, content: string): Promise<string> {
  try {
    const message = `
Please summarize the following conversation (question and answer) into a Japanese chat title of about 15 characters.
Output only the title—no explanation or extra text.

Conversation:
Question: ${prompt}
Answer: ${content}`;
    const messages = [
      { role: 'system', content: 'You are a helpful assistant. Answer in Japanese.' },
      { role: 'user', content: message },
    ];
    const result = await callLLM(messages, 0.3);
    return result?.substring(0, 30).trim() || '空のチャットタイトル';
  } catch {
    return '空のチャットタイトル';
  }
}

export async function getDualLanguageOutput(japaneseAnswer: string): Promise<string> {
  const { formatDualLanguageOutput } = await import('@/utils/translation');
  let translated = '';
  try {
    translated = await translateText(japaneseAnswer, 'en', true);
  } catch (e) {
    console.error('[Show Button] Failed to translate Japanese answer to English:', e);
    translated = '[Translation failed]';
  }
  return formatDualLanguageOutput(japaneseAnswer, translated, 'en');
}

export const chatGenProcess = async (job) => {
  const { taskId } = job.data;
  const type = 'CHAT';
  const mode: string = (config.RAG.mode || ['splitByPage'])[0];
  const useFaqCache: boolean = config.RAG.useFaqCache || false;
  const ragProcessor = await loadRagProcessor(mode);
  const cacheProcessor = await loadCacheProcessor(useFaqCache);

  const callAviary = async (outputId: number, metadata: string) => {
    // KPI Metrics tracking
    const kpiMetrics = {
      startTime: Date.now(),
      endTime: 0,
      totalTime: 0,
      ragUsed: false,
      ragTime: 0,
      llmTime: 0,
      translationTime: 0,
      queryTranslationTime: 0,
      inputTokens: 0,
      outputTokens: 0,
      modelUsed: config.Models.chatModel.name,
      userLanguage: 'unknown',
      fileCount: 0,
      responseLength: 0,
      englishLength: 0,
      japaneseLength: 0,
    };

    let [curOutput] = await queryList(KrdGenTaskOutput, { id: { [Op.eq]: outputId } });
    if (curOutput.status === 'CANCEL') return { outputId, isOk: false, content: '' };

    const outputs = await queryList(KrdGenTaskOutput, {
      task_id: { [Op.eq]: taskId },
      status: { [Op.ne]: 'IN_PROCESS' },
    });

    const messages = outputs.flatMap((op) => [
      { role: 'user', content: op.metadata },
      ...(op.content ? [{ role: 'assistant', content: op.content }] : []),
    ]);

    const data = JSON.parse(metadata);
    console.log(`\n========== [CHAT PROCESS] Starting chat generation ==========`);
    console.log(`[CHAT PROCESS] Task ID: ${taskId}, Output ID: ${outputId}`);
    console.log(`[CHAT PROCESS] Metadata:`, JSON.stringify(data, null, 2));

    // Check if files are uploaded
    const hasSpecificFiles = Array.isArray(data.fileId) && data.fileId.length > 0 && data.fileId[0] !== 0;
    
    let storage_keyArray: string[] = [];
    let fileNames: string[] = [];
    let hasFiles = hasSpecificFiles;
    
    if (hasSpecificFiles) {
      console.log(`[CHAT PROCESS] Processing ${data.fileId.length} specific file(s)`);
      for (const id of data.fileId) {
        const [file] = await queryList(File, { id: { [Op.eq]: id } });
        if (file) {
          storage_keyArray.push(file.storage_key);
          fileNames.push(file.filename);
          console.log(`[CHAT PROCESS] File ID ${id}: ${file.filename} (storage_key: ${file.storage_key})`);
        }
      }
    } else if (data.allFileSearch === true) {
      console.log(`[CHAT PROCESS] allFileSearch=true, fetching all files from database...`);
      const allFiles = await queryList(File, {});
      if (allFiles && allFiles.length > 0) {
        hasFiles = true;
        for (const file of allFiles) {
          storage_keyArray.push(file.storage_key);
          fileNames.push(file.filename);
          console.log(`[CHAT PROCESS] Found file: ${file.filename} (storage_key: ${file.storage_key})`);
        }
        console.log(`[CHAT PROCESS] Found ${allFiles.length} file(s) in database`);
      } else {
        console.log(`[CHAT PROCESS] No files in database`);
      }
    } else {
      console.log(`[CHAT PROCESS] No files to search`);
    }
    
    const filesAvailable = hasFiles && data.allFileSearch === true;
    
    console.log(`[CHAT PROCESS] File check: hasFiles=${hasFiles}, fileCount=${storage_keyArray.length}, allFileSearch=${data.allFileSearch}`);
    console.log(`[CHAT PROCESS] Files available for RAG: ${filesAvailable}`)

    console.log(`[CHAT PROCESS] Checking output status...`);
    try {
      [curOutput] = await queryList(KrdGenTaskOutput, { id: { [Op.eq]: outputId } });
      console.log(`[CHAT PROCESS] Output status: ${curOutput?.status}`);
    } catch (dbError) {
      console.error(`[CHAT PROCESS] Database error:`, dbError);
      return { outputId, isOk: false, content: 'Database error' };
    }
    
    if (curOutput.status === 'CANCEL') {
      console.log(`[CHAT PROCESS] Output ${outputId} was cancelled, aborting`);
      return { outputId, isOk: false, content: '' };
    }

    let prompt = data.prompt;
    
    // Step 1: Detect language and branch pipeline
    console.log(`\n[STEP 1] Language Detection`);
    console.log(`[STEP 1] Original prompt: "${data.prompt}"`);
    const userLanguage = detectLanguage(data.prompt);
    kpiMetrics.userLanguage = userLanguage;
    console.log(`[STEP 1] Language detected: ${userLanguage}`);
    console.log(`[STEP 1] Will respond in: ${userLanguage === 'ja' ? 'Japanese' : 'English'}`);

    let queryForRAG = data.prompt;
    let content = '';
    let isOk = true;
    let finalAnswer = '';
    
    // Pipeline 1: English Query
    if (userLanguage !== 'ja') {
      // Step 1: Translate English query to Japanese
      try {
        console.log(`\n[PIPELINE 1] English query detected - will translate to English at the end`);
        console.log(`[PIPELINE 1] Translating English query to Japanese for RAG search...`);
        
        const translationPromise = translateText(data.prompt, 'ja');
        const timeoutPromise = new Promise<string>((_, reject) => 
          setTimeout(() => reject(new Error('Translation timeout after 90 seconds')), 90000)
        );
        
        queryForRAG = await Promise.race([translationPromise, timeoutPromise]);
        console.log(`[PIPELINE 1] Query translation successful, translated query: ${queryForRAG}`);
      } catch (e) {
        console.error(`[PIPELINE 1] Query translation failed:`, e instanceof Error ? e.message : String(e));
        console.warn(`[PIPELINE 1] Using original English query as fallback`);
        queryForRAG = data.prompt;
      }
    } else {
      // Pipeline 2: Japanese Query
      console.log(`\n[PIPELINE 2] Japanese query detected - will respond in Japanese`);
      queryForRAG = data.prompt;
    }

    // Step 2: RAG search
    const useRAGForQuery = filesAvailable;
    
    console.log(`\n[STEP 2] RAG Decision: useRAGForQuery=${useRAGForQuery} (filesAvailable=${filesAvailable})`);
    
    if (useRAGForQuery) {
      console.log(`\n[STEP 2] RAG Search (using Japanese query for document search)`);
      kpiMetrics.ragUsed = true;
      const ragStartTime = Date.now();
      try {
        [curOutput] = await queryList(KrdGenTaskOutput, { id: { [Op.eq]: outputId } });
        if (curOutput.status === 'CANCEL') {
          console.log(`[STEP 2] Output cancelled during RAG search`);
          return { outputId, isOk: false, content: '' };
        }

        console.log(`[STEP 2] Starting RAG search with query: "${queryForRAG}"`);
        console.log(`[STEP 2] Searching ${storage_keyArray.length} document(s) via Solr`);
        
        try {
          // Search using Solr
          const searchTerms = queryForRAG.split(/\s+/).filter(t => t.length > 2).map(t => `"${t}"`).join(' OR ');
          const solrQuery = encodeURIComponent(searchTerms || '*:*');
          const fileFilter = storage_keyArray.map(k => `id:"${k}"`).join(' OR ');
          const solrUrl = `${config.ApacheSolr.url}/solr/mycore/select?q=${solrQuery}&fq=(${fileFilter})&rows=5&wt=json`;
          
          console.log(`[STEP 2] Solr URL: ${solrUrl.substring(0, 150)}...`);
          
          const response = await fetch(solrUrl);
          const results = await response.json();
          
          console.log(`[STEP 2] Solr returned ${results.response?.docs?.length || 0} document(s)`);
          
          if (results.response?.docs && results.response.docs.length > 0) {
            let documentContent = '';
            for (const doc of results.response.docs) {
              // Safely handle doc content - could be string or array
              let docContent = doc._text_ || doc.content || '';
              
              // If it's an array, join it into a string
              if (Array.isArray(docContent)) {
                docContent = docContent.join(' ');
              }
              
              // Convert to string if it's not already
              docContent = String(docContent || '');
              
              // Extract substring safely
              const contentPreview = docContent.substring(0, 500);
              
              documentContent += `Document: ${doc.title || doc.id}\n`;
              documentContent += `Content: ${contentPreview}\n\n`;
              
              console.log(`[STEP 2] Added document: ${doc.id}, content length: ${contentPreview.length}`);
            }
            prompt = `Document content for reference:\n${documentContent}\n\nUser query: ${queryForRAG}`;
            console.log(`[STEP 2] RAG content prepared, length: ${prompt.length}`);
          } else {
            console.log(`[STEP 2] No documents found, continuing without RAG context`);
            prompt = queryForRAG;
          }
        } catch (solrError) {
          console.error(`[STEP 2] Solr search error:`, solrError);
          prompt = queryForRAG;
        }
        kpiMetrics.ragTime = Date.now() - ragStartTime;
        console.log(`[STEP 2] RAG search completed in ${kpiMetrics.ragTime}ms`);

        [curOutput] = await queryList(KrdGenTaskOutput, { id: { [Op.eq]: outputId } });
        if (curOutput.status === 'CANCEL') {
          console.log(`[STEP 2] Output cancelled after RAG search`);
          return { outputId, isOk: false, content: '' };
        }
      } catch (e) {
        console.error(`[STEP 2] RAG search outer error:`, e);
        content = 'error happen';
        isOk = false;
      }
    } else {
      console.log(`\n[STEP 2] Skipping RAG (No files uploaded - using LLM only)`);
    }
    
    // Step 3: Generate answer with LLM in Japanese (documents are in Japanese)
    if (content !== "error happen" && isOk) {
      console.log(`\n[STEP 3] LLM Generation`);
      // Always generate answer in Japanese (documents are Japanese)
      let systemMessageContent = `You are a helpful assistant. Answer ONLY using the document content provided. Respond in Japanese.`;
      const systemMessage = { role: 'system', content: systemMessageContent };
      const messagesWithSystem = [systemMessage, ...messages, { role: 'user', content: prompt }];
      const inputText = messagesWithSystem.map(m => m.content).join(' ');
      kpiMetrics.inputTokens = Math.ceil(inputText.length / 4);

      [curOutput] = await queryList(KrdGenTaskOutput, { id: { [Op.eq]: outputId } });
      if (curOutput.status === 'CANCEL') {
        console.log(`[STEP 3] Output cancelled before LLM generation`);
        return { outputId, isOk: false, content: '' };
      }

      const llmStartTime = Date.now();
      console.log(`[STEP 3] Calling LLM to generate Japanese response...`);
      let llmAnswer = await generateWithLLM(messagesWithSystem, outputId);
      kpiMetrics.llmTime = Date.now() - llmStartTime;
      kpiMetrics.outputTokens = Math.ceil(llmAnswer.length / 4);

      // Clean up LLM answer - remove all markdown formatting and markers
      llmAnswer = llmAnswer
        // Remove language labels
        .replace(/\*+(English|日本語|Japanese|Translation)\*+\s*:?\s*\n?/gi, '')
        .replace(/\[(English|Japanese)\]\s*:?\s*\n?/gi, '')
        .replace(/^(English|Japanese|Translation)[\s:]*\n?/gmi, '')
        // Remove markdown asterisks formatting
        .replace(/\*\*\*(.+?)\*\*\*/g, '$1')  // ***bold italic*** → bold italic
        .replace(/\*\*(.+?)\*\*/g, '$1')      // **bold** → bold
        .replace(/\*(.+?)\*/g, '$1')           // *italic* → italic
        // Remove markdown heading symbols
        .replace(/^#+\s+/gm, '')               // # ## ### etc.
        // Clean excessive newlines
        .replace(/\n\n\n+/g, '\n\n')
        .trim();

      // Pipeline 1: If original query was English, translate answer to English for display
      if (userLanguage !== 'ja') {
        try {
          console.log(`[PIPELINE 1] Detected English query - translating Japanese answer to English...`);
          console.log(`[PIPELINE 1] Japanese answer (before translation): "${llmAnswer.substring(0, 100)}..."`);
          console.log(`[PIPELINE 1] User language: ${userLanguage} - Response will be in English ONLY`);
          
          // Use simple timeout instead of Promise.race for more reliable translation
          let translatedAnswer = await translateText(llmAnswer, 'en');
          
          console.log(`[PIPELINE 1] Answer translation successful, length: ${translatedAnswer.length}`);
          console.log(`[PIPELINE 1] English answer (after translation): "${translatedAnswer.substring(0, 100)}..."`);
          // IMPORTANT: Only set the translated answer, not the Japanese one
          finalAnswer = translatedAnswer;
          content = translatedAnswer;
          console.log(`[PIPELINE 1] Final response set to English (translated), length: ${finalAnswer.length}`);
        } catch (e) {
          console.error(`[PIPELINE 1] Failed to translate answer to English:`, e instanceof Error ? e.message : String(e));
          console.warn(`[PIPELINE 1] Translation failed - retrying with fallback mechanism`);
          try {
            // Retry translation with longer timeout (3 minutes)
            let retryAnswer = await new Promise<string>((resolve, reject) => {
              const timeout = setTimeout(() => reject(new Error('Translation timeout')), 180000);
              translateText(llmAnswer, 'en').then(result => {
                clearTimeout(timeout);
                resolve(result);
              }).catch(error => {
                clearTimeout(timeout);
                reject(error);
              });
            });
            finalAnswer = retryAnswer;
            content = retryAnswer;
            console.log(`[PIPELINE 1] Retry successful, using translated answer, length: ${finalAnswer.length}`);
          } catch (retryError) {
            console.error(`[PIPELINE 1] Retry also failed, will use Japanese answer as fallback`);
            console.warn(`[PIPELINE 1] WARNING: Returning Japanese answer because translation failed`);
            finalAnswer = llmAnswer;
            content = llmAnswer;
          }
        }
      } else {
        // Pipeline 2: Japanese query, display Japanese answer
        console.log(`[PIPELINE 2] Detected Japanese query - using Japanese answer directly`);
        console.log(`[PIPELINE 2] User language: ${userLanguage} - Response will be in Japanese`);
        finalAnswer = llmAnswer;
        content = llmAnswer;
        console.log(`[PIPELINE 2] Final response set to Japanese, length: ${finalAnswer.length}`);
      }

      if (outputs.length === 0) {
        console.log(`[STEP 3] First message in chat - generating title...`);
        const chatTitle = await createChatTitle(prompt, finalAnswer);
        console.log(`[STEP 3] Generated chat title: "${chatTitle}"`);
        await put<IGenTaskSer>(KrdGenTask, { id: taskId }, {
          form_data: chatTitle,
          update_by: 'JOB',
        });
      }
    }
    
    isOk = content !== 'error happen' && content.length > 0;
    console.log(`[STEP 3] Generation status: ${isOk ? 'SUCCESS' : 'FAILED'}`);

    if (config.APP_MODE === 'rag-evaluation') {
      content = prompt + "\n\n## LLM Response\n\n" + content;
      console.log(`[STEP 3] RAG evaluation mode - appending prompt to content`);
    }
    
    // Step 4: Store single-language output
    console.log(`\n[STEP 4] Single-Language Output Creation`);
    if (isOk) {
      try {
        console.log(`[STEP 4] User language: ${userLanguage}`);
        console.log(`[STEP 4] Response language will be: ${userLanguage}`);
        console.log(`[STEP 4] LLM answer length: ${finalAnswer.length}`);

        if (!finalAnswer) {
          finalAnswer = content || '';
        }

        content = formatSingleLanguageOutput(finalAnswer, userLanguage as LanguageCode);
        console.log(`[STEP 4] Formatted output created, length: ${content.length}`);
      } catch (e) {
        console.error(`[STEP 4] Formatting error:`, e);
        isOk = false;
        content = 'error happen';
      }
    }

    kpiMetrics.endTime = Date.now();
    kpiMetrics.totalTime = kpiMetrics.endTime - kpiMetrics.startTime;
    kpiMetrics.responseLength = content.length;
    
    const finalStatus = isOk ? 'FINISHED' : 'FAILED';
    
    console.log(`\n[CHAT PROCESS] Storing output...`);
    console.log(`[CHAT PROCESS] Status: ${finalStatus}, Content length: ${content.length}`);
    console.log(`[CHAT PROCESS] KPI metrics:`, kpiMetrics);

    try {
      await put<IGenTaskOutputSer>(
        KrdGenTaskOutput,
        { id: outputId },
        {
          content,
          status: finalStatus,
          update_by: 'JOB',
        },
      );
    } catch (dbError) {
      console.error(`[CHAT PROCESS] Failed to update database:`, dbError);
    }

    console.log(`\n========== [CHAT PROCESS] Completed ==========`);
    console.log(`[CHAT PROCESS] Final status: ${finalStatus}`);
    console.log(`[CHAT PROCESS] Output ID: ${outputId}, Content length: ${content.length}`);
    console.log(`[CHAT PROCESS] Total processing time: ${kpiMetrics.totalTime}ms`);
    console.log(`[CHAT PROCESS] ===========================================\n`);

    return { outputId, isOk, content };
  };

  await execute(type, taskId, callAviary);
};
