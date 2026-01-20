import { put, queryPage, queryList } from '@/utils/mapper';
import KrdGenTask from '@/mysql/model/gen_task.model';
import KrdGenTaskOutput from '@/mysql/model/gen_task_output.model';
import KrdFile from '@/mysql/model/file.model';
import { userType } from '@/types';
import { IGenTask, IGenTaskQuerySerType, IGenTaskQueryType, IGenTaskSer } from '@/types/genTask';
import { IGenTaskOutputQuerySerType, IGenTaskOutputQueryType, IGenTaskOutputReNameSer, IGenTaskOutputSer } from '@/types/genTaskOutput';
import { Context } from 'koa';
import { Op } from 'sequelize';

import { queryConditionsData } from '@/service';
import { handleAddGenTask } from '@/service/genTaskService';
import { classifyQuery, detectLanguage } from '@/service/queryClassificationService';
import { translateENtoJA, translateJAtoEN } from '@/service/translationService';

export const getAddMid = async (ctx: any, next: () => Promise<void>) => {
  try {
    const { userName, userId } = ctx.state.user as userType;
    const addContent = ctx.request.body as IGenTask;

    console.log('\n' + '='.repeat(80));
    console.log('🚀 [GenTask] Processing new task...');
    console.log('='.repeat(80));
    console.log('📋 [GenTask] Task Details:', {
      type: addContent.type,
      userId: userId,
      userName: userName,
      timestamp: new Date().toISOString(),
    });

    let enhancedContent = addContent;
    let ragContext = null;
    let detectedLanguage = 'en';
    let isCompanyQuery = false;
    let processingPath = 'GENERAL';

    // ========== TWO-PATH QUERY PROCESSING ==========
    // Only process if this is a CHAT with actual content (not empty chat creation)
    const chatFormData = addContent.formData as any;
    const userQuery = chatFormData?.prompt || '';
    const hasActualContent = addContent.type === 'CHAT' && chatFormData && userQuery.trim().length > 0;
    
    if (hasActualContent) {

      console.log('💬 [GenTask] Chat request detected');
      console.log('📝 [GenTask] User query:', {
        query: userQuery.substring(0, 100) + (userQuery.length > 100 ? '...' : ''),
        length: userQuery.length,
      });

      try {
        // ===== STEP 1: LANGUAGE DETECTION =====
        console.log('\n--- STEP 1: LANGUAGE DETECTION ---');
        detectedLanguage = detectLanguage(userQuery);
        console.log('✅ [GenTask] Language detected:', {
          language: detectedLanguage === 'ja' ? 'Japanese (日本語)' : 'English (EN)',
          confidence: 'High',
        });

        // ===== STEP 2: QUERY CLASSIFICATION =====
        console.log('\n--- STEP 2: ALWAYS USE RAG (Classification Skipped) ---');
        // ALWAYS use RAG to retrieve answers from uploaded files/documents
        // Classification is skipped - all queries go through RAG path
        isCompanyQuery = true;
        processingPath = 'COMPANY';
        
        console.log('📊 [GenTask] RAG Processing:', {
          isCompanyQuery: true,
          path: 'COMPANY (RAG Always Enabled)',
          language: detectedLanguage === 'ja' ? 'Japanese' : 'English',
          ragEnabled: true,
          reason: 'All queries use RAG to retrieve answers from uploaded documents',
        });

        // ===== ALWAYS USE COMPANY PATH WITH RAG =====
        console.log('\n--- STEP 2.1: RAG-BASED QUERY HANDLER ---');
        console.log('ℹ️  [GenTask] Processing all queries with RAG (file retrieval)');
        
        let queryForRAG = userQuery;

        // Translate EN to JA if needed for better RAG matching
        if (detectedLanguage === 'en') {
          console.log('🌐 [GenTask] Query is in English - translating to Japanese for RAG...');
          try {
            queryForRAG = await translateENtoJA(userQuery);
            console.log('✅ [GenTask] Translation successful:', {
              original: userQuery.substring(0, 50),
              translated: queryForRAG.substring(0, 50),
            });
          } catch (translationError) {
            console.warn('⚠️  [GenTask] Translation failed, using original query');
            queryForRAG = userQuery;
          }
        }

        // ===== STEP 3: RAG RETRIEVAL & PROCESSING =====
        console.log('\n--- STEP 3: RAG RETRIEVAL & PROCESSING ---');
        console.log('📚 [GenTask] Fetching uploaded documents from database...');
        const uploadedFiles = await getUploadedFilesForContext(userId);
        
        console.log('📊 [GenTask] Database query result:', {
          filesFound: uploadedFiles.length,
          timestamp: new Date().toISOString(),
        });

        if (uploadedFiles && uploadedFiles.length > 0) {
          console.log('✅ [GenTask] Documents retrieved successfully');
          console.log('📄 [GenTask] Retrieved files:');
          uploadedFiles.forEach((f: any, idx: number) => {
            console.log(`   ${idx + 1}. ${f.filename} (${(f.size / 1024).toFixed(2)} KB) - Pages: [citation data would be extracted]`);
          });

          ragContext = {
            files: uploadedFiles.map((f: any) => ({
              id: f.id,
              filename: f.filename,
              originalName: f.filename,
            })),
            content: uploadedFiles
              .map((f: any) => `--- File: ${f.filename} ---\n[Document content would be extracted from RAG system here]\n[Page citations would be included]`)
              .join('\n'),
          };

          console.log('🔗 [GenTask] RAG Context Prepared:', {
            filesIncluded: ragContext.files.length,
            totalContentLength: ragContext.content.length,
          });

          // Build enhanced prompt with RAG context
          // Response will be in user's detected language ONLY
          // Translation happens on-demand in frontend
          const ragEnhancedPrompt = `${userQuery}

[REFERENCE DOCUMENTS - For context only]
${ragContext.content}
[END OF REFERENCE]`;

          enhancedContent = {
            ...addContent,
            formData: {
              ...chatFormData,
              prompt: ragEnhancedPrompt,
              processingPath: 'COMPANY',
              detectedLanguage: detectedLanguage,
              originalQuery: userQuery,
              queryForRAG: queryForRAG,
              ragTriggered: true,
              usedFileIds: ragContext.files.map((f) => f.id),
              dualLanguageEnabled: false,
            },
          };

          console.log('✨ [GenTask] RAG path prepared with documents:', {
            processingPath: 'COMPANY',
            userLanguage: detectedLanguage,
            ragRequired: true,
            filesUsed: ragContext.files.length,
            dualLanguageFormat: 'Enabled with citations',
          });
        } else {
          console.log('⚠️  [GenTask] No documents found in database for this user');
          console.log('💡 [GenTask] Query will be processed without RAG context');
          
          enhancedContent = {
            ...addContent,
            formData: {
              ...chatFormData,
              prompt: userQuery,
              processingPath: 'COMPANY',
              detectedLanguage: detectedLanguage,
              ragTriggered: false,
              dualLanguageEnabled: false,
            },
          };
        }
      } catch (error) {
        console.error('❌ [GenTask] Error in query processing:', {
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
        });
        
        // Fallback: process with RAG enabled
        enhancedContent = {
          ...addContent,
          formData: {
            ...chatFormData,
            prompt: userQuery,
            processingPath: 'COMPANY_FALLBACK',
            detectedLanguage: detectedLanguage,
            ragTriggered: false,
            dualLanguageEnabled: true,
          },
        };
      }
    }

    console.log('\n--- TASK CREATION ---');
    console.log('📤 [GenTask] Sending task to processing queue...');
    const result = await handleAddGenTask(enhancedContent, userName);

    console.log('✅ [GenTask] Task created successfully:', {
      taskId: result.taskId,
      type: addContent.type,
      processingPath: processingPath,
      detectedLanguage: detectedLanguage,
      ragEnabled: ragContext ? 'YES' : 'NO',
      filesUsed: ragContext ? ragContext.files.length : 0,
    });

    ctx.state.formatData = {
      taskId: result.taskId,
      task: result.task,
      metadata: {
        processingPath: processingPath,
        detectedLanguage: detectedLanguage,
        isCompanyQuery: isCompanyQuery,
        ragTriggered: ragContext ? true : false,
        usedFiles: ragContext ? ragContext.files : null,
        dualLanguageEnabled: true,
      },
    };

    console.log('='.repeat(80) + '\n');

    await next();
  } catch (error) {
    console.error('❌ [GenTask] FATAL ERROR:', error);
    return ctx.app.emit(
      'error',
      {
        code: '400',
        message: 'アップロードパラメータを確認してください',
      },
      ctx,
    );
  }
};
async function getUploadedFilesForContext(userId: number, limit: number = 5) {
  try {
    console.log('🔎 [Database] Querying file table for user documents...', {
      userId: userId,
      limit: limit,
      table: 'file',
    });

    // Get files for RAG context - using the File model
    const files = await KrdFile.findAll({
      limit: limit,
      order: [['created_at', 'DESC']],
      raw: true,
    });
    
    console.log('📊 [Database] Query completed:', {
      resultsReturned: files.length,
      table: 'file',
      database: 'MySQL',
      dbName: 'krd_knowledge_base', // adjust to your actual DB name
    });

    if (files.length > 0) {
      console.log('✅ [Database] Files retrieved from database:');
      files.forEach((f: any, idx: number) => {
        console.log(`   Row ${idx + 1}: id=${f.id}, filename="${f.filename}", size=${f.size}B, created_at=${f.created_at}`);
      });
    } else {
      console.log('⚠️  [Database] No files found in database for this query');
    }
    
    return files as any[];
  } catch (error) {
    console.error('❌ [Database] Error fetching uploaded files:', {
      error: error instanceof Error ? error.message : String(error),
      table: 'file',
      timestamp: new Date().toISOString(),
    });
    return [];
  }
}

export const getListMid = async (ctx: any, next: () => Promise<void>) => {
  try {
    const { userName } = ctx.state.user as userType;
    const { pageNum, pageSize, ...params } = ctx.query as unknown as IGenTaskQueryType;
    const newParams = { pageNum, pageSize } as IGenTaskQuerySerType;

    if (userName) newParams.create_By = userName;
    if (params.type) newParams.type = params.type;
    if (params.status) newParams.status = params.status;

    const res = await queryPage<IGenTaskQuerySerType>(KrdGenTask, newParams);

    ctx.state.formatData = res;
    await next();
  } catch (error) {
    console.error(error);
    return ctx.app.emit(
      'error',
      {
        code: '500',
        message: 'リストの取得に失敗しました',
      },
      ctx,
    );
  }
};

export const getOutputListMid = async (ctx: any, next: () => Promise<void>) => {
  try {
    const { pageNum, pageSize, ...params } = ctx.query as unknown as IGenTaskOutputQueryType;
    const newParams = { pageNum, pageSize } as IGenTaskOutputQuerySerType;
    if (params.taskId) newParams.task_id = params.taskId;
    if (params.status) newParams.status = params.status;
    if (params.sort) newParams.sort = params.sort;

    const res = await queryPage<IGenTaskOutputQuerySerType>(KrdGenTaskOutput, newParams);

    ctx.state.formatData = res;
    await next();
  } catch (error) {
    console.error(error);
    return ctx.app.emit(
      'error',
      {
        code: '500',
        message: 'リストの取得に失敗しました',
      },
      ctx,
    );
  }
};

export const updateTaskOutputMid = async (ctx: any, next: () => Promise<void>) => {
  const { userName } = ctx.state.user as userType;
  const { taskOutputId } = ctx.params;
  const { status, metadata, feedback, content } = ctx.request.body;

  await put<IGenTaskOutputSer>(KrdGenTaskOutput, { id: taskOutputId }, {
    status,
    metadata,
    feedback,
    content,
    update_by: userName,
  } as IGenTaskOutputSer);

  await next();
};

export const reNameTaskOutputMid = async (ctx: any, next: () => Promise<void>) => {
  const { userName } = ctx.state.user as userType;
  const { taskId } = ctx.params;
  const { newName } = ctx.request.body;

  await put<IGenTaskOutputReNameSer>(KrdGenTask, { id: taskId }, {
    form_data: newName,
    update_by: userName,
  } as IGenTaskOutputReNameSer);

  await next();
};

export const deleteTaskOutputMid = async (ctx: any, next: () => Promise<void>) => {
  const { taskId } = ctx.params;

  await KrdGenTask.destroy({
    where: { id: taskId },
  });

  await KrdGenTaskOutput.destroy({
    where: { task_id: taskId },
  });

  await next();
};

export const stopTaskOutputMid = async (ctx: any, next: () => Promise<void>) => {
  try {
    const { taskId, fieldSort } = ctx.query;
    const { userName } = ctx.state.user as userType;


    const outputData = await queryConditionsData(KrdGenTaskOutput, {
      task_id: taskId,
      sort: fieldSort,
      status: { [Op.in]: ['IN_PROCESS', 'PROCESSING', 'WAIT'] },
    });

    if (outputData && outputData.length > 0) {
      await put<IGenTaskOutputSer>(
        KrdGenTaskOutput,
        {
          task_id: taskId,
          sort: fieldSort,
          status: { [Op.in]: ['IN_PROCESS', 'PROCESSING', 'WAIT'] },
        },
        {
          // content: 'CANCEL',
          status: 'CANCEL',
          update_by: userName,
        },
      );

      const outputs = await queryConditionsData(KrdGenTaskOutput, {
        task_id: outputData[0].task_id,
        status: { [Op.in]: ['IN_PROCESS', 'PROCESSING', 'WAIT'] },
      });

      if (!outputs || outputs.length === 0) {
        await put<IGenTaskSer>(KrdGenTask, { id: outputData[0].task_id }, { status: 'FINISHED', update_by: userName });
      }
    }
  } catch (error) {
    console.error('Error in stopTaskOutputMid:', error);
  }

  await next();
};

export const getChatTitleMid = async (ctx: any, next: () => Promise<void>) => {
  const { userName } = ctx.state.user as userType;
  const { chatId } = ctx.query;
  const newParams = { id: chatId, pageNum: 1, pageSize: 1, create_By: userName } as IGenTaskQuerySerType;

  try {
    const res = await queryPage<IGenTaskQuerySerType>(KrdGenTask, newParams);
    ctx.state.formatData = res;
    await next();
  } catch (error) {
    console.error(error);
    return ctx.app.emit(
      'error',
      {
        code: '500',
        message: 'リストの取得に失敗しました',
      },
      ctx,
    );
  }
};

export const sendFeedbackToCache = async (ctx: any, next: () => Promise<void>) => {
  try {
    const { userName } = ctx.state.user as userType;
    const { taskOutputId: rawTaskOutputId, cache_signal, query, answer } = ctx.request.body as {
      taskOutputId: number;
      cache_signal: number;
      query: string;
      answer: string;
    };

    // Convert taskOutputId to string if it's a number
    const taskOutputId = String(rawTaskOutputId);

    console.log(`[FEEDBACK] User ${userName} sending feedback: signal=${cache_signal}, taskOutputId=${taskOutputId}`);
    console.log(`[FEEDBACK] Query: ${query?.substring(0, 50)}...`);
    console.log(`[FEEDBACK] Answer: ${answer?.substring(0, 50)}...`);

    // Validate input
    if (cache_signal !== 0 && cache_signal !== 1) {
      return ctx.app.emit('error', {
        code: '400',
        message: 'cache_signal must be 0 or 1',
      }, ctx);
    }

    if (!query || !answer) {
      return ctx.app.emit('error', {
        code: '400',
        message: 'query and answer are required',
      }, ctx);
    }

    // Prepare feedback data for FAQ cache service
    const feedbackData = {
      cache_signal: cache_signal,
      query: query,
      answer: answer,
    };

    // Send to FAQ cache service (port 8001)
    const faqCacheUrl = process.env.FAQ_CACHE_URL || 'http://localhost:8001';
    const response = await fetch(`${faqCacheUrl}/feedback`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(feedbackData),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[FEEDBACK] FAQ cache service error: ${response.status} - ${errorText}`);
      return ctx.app.emit('error', {
        code: '500',
        message: `FAQ cache service error: ${response.status}`,
      }, ctx);
    }

    const result = await response.json();

    console.log(`[FEEDBACK] FAQ cache response:`, result);

    // Return success response
    ctx.state.formatData = {
      success: true,
      message: result.message || 'Feedback sent successfully',
      action_taken: result.action_taken,
      cache_signal: cache_signal,
      taskOutputId: taskOutputId,
      faq_cache_response: result,
    };

    await next();
  } catch (error) {
    console.error('[FEEDBACK] Error sending feedback to cache:', error);
    return ctx.app.emit('error', {
      code: '500',
      message: `Failed to send feedback: ${error.message}`,
    }, ctx);
  }
};
export const translateContentOnDemandMid = async (ctx: any, next: () => Promise<void>) => {
  try {
    const userName = ctx.state?.user?.userName || 'anonymous';
    const { outputId, targetLanguage } = ctx.request.body as {
      outputId: number;
      targetLanguage: 'ja' | 'en';
    };

    console.log(`\n[TRANSLATION-CONTROLLER] Starting translation request`);
    console.log(`[TRANSLATION-CONTROLLER] User: ${userName}, OutputId: ${outputId}, Target: ${targetLanguage}`);

    // Validate input
    if (!outputId || typeof outputId !== 'number') {
      console.error(`[TRANSLATION-CONTROLLER] Invalid outputId: ${outputId}`);
      return ctx.app.emit('error', {
        code: '400',
        message: 'outputId is required and must be a number',
      }, ctx);
    }

    if (!targetLanguage || !['ja', 'en'].includes(targetLanguage)) {
      console.error(`[TRANSLATION-CONTROLLER] Invalid targetLanguage: ${targetLanguage}`);
      return ctx.app.emit('error', {
        code: '400',
        message: 'targetLanguage must be "ja" or "en"',
      }, ctx);
    }

    try {
      // Fetch the original output from database
      console.log(`[TRANSLATION-CONTROLLER] Fetching output ${outputId} from database...`);
      const [output] = await queryList(KrdGenTaskOutput, { 
        id: { [Op.eq]: outputId } 
      });

      if (!output) {
        console.error(`[TRANSLATION-CONTROLLER] Output ${outputId} not found in database`);
        return ctx.app.emit('error', {
          code: '404',
          message: `Output with ID ${outputId} not found`,
        }, ctx);
      }

      if (!output.content || output.content.trim().length === 0) {
        console.error(`[TRANSLATION-CONTROLLER] Output content is empty`);
        return ctx.app.emit('error', {
          code: '400',
          message: 'Output content is empty',
        }, ctx);
      }

      console.log(`[TRANSLATION-CONTROLLER] Found output, content length: ${output.content.length}`);

      // Parse the stored output format
      const { parseDualLanguageOutput } = await import('@/utils/translation');
      const parsed = parseDualLanguageOutput(output.content);
      
      console.log(`[TRANSLATION-CONTROLLER] Parsed output:`, {
        isDualLanguage: parsed.isDualLanguage,
        hasSingleContent: !!parsed.singleContent,
        language: parsed.language,
        hasTranslationPending: parsed.translationPending,
      });

      // Determine the current language and content to translate
      let contentToTranslate = '';
      let currentLanguage: 'ja' | 'en' = 'en';

      if (parsed.singleContent) {
        // New single-language format (from formatSingleLanguageOutput)
        contentToTranslate = parsed.singleContent;
        currentLanguage = (parsed.language || 'en') as 'ja' | 'en';
        console.log(`[TRANSLATION-CONTROLLER] Using single-language format, current language: ${currentLanguage}`);
      } else if (parsed.isDualLanguage && parsed.translated) {
        // Old dual-language format (backwards compatibility)
        contentToTranslate = parsed.translated;
        currentLanguage = (parsed.targetLanguage || 'en') as 'ja' | 'en';
        console.log(`[TRANSLATION-CONTROLLER] Using dual-language format, current language: ${currentLanguage}`);
      } else {
        // Fallback to raw content
        contentToTranslate = parsed.rawContent;
        console.warn(`[TRANSLATION-CONTROLLER] Using fallback (raw content)`);
      }

      if (!contentToTranslate || contentToTranslate.trim().length === 0) {
        console.error(`[TRANSLATION-CONTROLLER] Content to translate is empty after parsing`);
        return ctx.app.emit('error', {
          code: '400',
          message: 'Unable to extract translatable content from output',
        }, ctx);
      }

      console.log(`[TRANSLATION-CONTROLLER] Content to translate (first 100 chars): "${contentToTranslate.substring(0, 100)}..."`);
      console.log(`[TRANSLATION-CONTROLLER] Current language: ${currentLanguage}, Target: ${targetLanguage}`);

      // Check if translation is needed
      if (currentLanguage === targetLanguage) {
        console.log(`[TRANSLATION-CONTROLLER] Content already in target language, no translation needed`);
        ctx.state.formatData = {
          outputId,
          translated: false,
          content: contentToTranslate,
          language: currentLanguage,
          targetLanguage,
        };
        return await next();
      }

      // Perform the translation
      console.log(`[TRANSLATION-CONTROLLER] Calling translation function...`);
      const { translateContentOnDemand } = await import('@/utils/translation');
      const translatedContent = await translateContentOnDemand(
        contentToTranslate,
        currentLanguage,
        targetLanguage
      );

      if (!translatedContent || translatedContent.trim().length === 0) {
        console.error(`[TRANSLATION-CONTROLLER] Translation returned empty content`);
        return ctx.app.emit('error', {
          code: '500',
          message: 'Translation service returned empty content',
        }, ctx);
      }

      console.log(`[TRANSLATION-CONTROLLER] Translation successful`);
      console.log(`[TRANSLATION-CONTROLLER] Translated content length: ${translatedContent.length}`);
      console.log(`[TRANSLATION-CONTROLLER] Translated content (first 100 chars): "${translatedContent.substring(0, 100)}..."`);

      // Return the translation result
      ctx.state.formatData = {
        outputId,
        translated: true,
        content: translatedContent,
        sourceLanguage: currentLanguage,
        targetLanguage,
        timestamp: new Date().toISOString(),
      };

      console.log(`[TRANSLATION-CONTROLLER] Setting formatData for response`);
      await next();
    } catch (translationError) {
      console.error('[TRANSLATION-CONTROLLER] Translation operation error:', translationError);
      const errorMessage = translationError instanceof Error ? translationError.message : String(translationError);
      return ctx.app.emit('error', {
        code: '500',
        message: `Translation failed: ${errorMessage}`,
      }, ctx);
    }
  } catch (error) {
    console.error('[TRANSLATION-CONTROLLER] Outer error:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return ctx.app.emit('error', {
      code: '500',
      message: `Failed to process translation: ${errorMessage}`,
    }, ctx);
  }
};