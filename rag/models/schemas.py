from typing import Dict, List, Literal, Optional
from pydantic import BaseModel, ConfigDict, Field


class SearchRequest(BaseModel):
    collection_name: list[str]
    query: str
    top_k: int = 10
    mode: str = "default"


class DeleteRequest(BaseModel):
    collection_name: str
    ids: Optional[List[str]] = None


class DeleteResponseModel(BaseModel):
    status: Literal["deleted", "no match", "failed"]
    collection: str
    deleted_records: Optional[List[str]] = None


class UpdateRequest(BaseModel):
    collection_name: str
    ids: List[str]
    documents: List[str]
    metadatas: Optional[List[Dict]] = None


class ArticleBasedSplitRecordMetadataModel(BaseModel):
    """
    Metadata schema for article-based split records from IJTT's structured PDF file.
    ChromaDB does not support None or empty string values in metadata,
    so all fields with None or empty string values will be converted to the string "<|None|>".
    """
    model_config = ConfigDict(extra="allow")

    DocumentName: Optional[str] = None
    DocumentStandardNumber: Optional[str] = None
    ResponsibleDepartment: Optional[str] = None
    Established: Optional[str] = None
    LastRevised: Optional[str] = None
    ChapterNumber: Optional[int | str] = None
    ChapterName: Optional[str] = None
    SectionNumber: Optional[int | str] = None
    SectionName: Optional[str] = None
    ArticleName: Optional[str] = None
    ArticleNumber: Optional[int | str] = None

    def to_dict(self) -> Dict[str, str]:
        def _none_guard(v: str | None) -> str:
            if v is None:
                return "<|None|>"
            s = str(v).strip()
            return s if s else "<|None|>"

        raw_dict = self.model_dump(exclude_none=False)
        return {k: _none_guard(v) for k, v in raw_dict.items()}

    def build_hierarchy_label(self) -> str:
        md = self.to_dict()
        doc_name = md.get("DocumentName")

        if doc_name and doc_name != "<|None|>":
            title = doc_name

        ch_n = md.get("ChapterNumber")
        ch_nm = md.get("ChapterName")
        chapter = ""
        if ch_n is not None and ch_n != "<|None|>":
            chapter = f"第{ch_n}章" + (
                f"  {ch_nm}" if ch_nm and ch_nm != "<|None|>" else ""
            )
        elif ch_nm and ch_nm != "<|None|>":
            chapter = ch_nm

        sec_n = md.get("SectionNumber")
        sec_nm = md.get("SectionName")
        section = ""
        if sec_n is not None and sec_n != "<|None|>":
            section = f"第{sec_n}節" + (
                f" {sec_nm}" if sec_nm and sec_nm != "<|None|>" else ""
            )
        elif sec_nm and sec_nm != "<|None|>":
            section = sec_nm

        art_n = md.get("ArticleNumber")
        art_nm = md.get("ArticleName")
        article = ""
        if art_n is not None and art_n != "<|None|>":
            article = f"第{art_n}条" + (
                f" {art_nm}" if art_nm and art_nm != "<|None|>" else ""
            )
        elif art_nm and art_nm != "<|None|>":
            article = art_nm

        parts = [p for p in (chapter, section, article) if p]
        if title and parts:
            return f"{title}  / " + " / ".join(parts)
        elif title:
            return title
        else:
            return " / ".join(parts)


class UploadFileResultModel(BaseModel):
    status: Literal["uploaded", "failed"]
    count: int
