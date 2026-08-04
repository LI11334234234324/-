import React, { useState } from 'react';
import {
  X,
  Upload,
  Link,
  FileText,
  Sparkles,
  Music,
  Plus,
  HelpCircle,
  FolderPlus,
  CheckCircle2,
  Loader2,
  FileCheck,
} from 'lucide-react';
import { Track, ParagraphSegment } from '../types';
import { parseTextToSegments } from '../utils/lrcParser';
import { parsePdfFile } from '../utils/pdfParser';

interface AddTrackModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddTrack: (track: Track) => void;
  onImportJson: (jsonData: string) => void;
}

export const AddTrackModal: React.FC<AddTrackModalProps> = ({
  isOpen,
  onClose,
  onAddTrack,
  onImportJson,
}) => {
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [category, setCategory] = useState('自定义');
  const [description, setDescription] = useState('');
  
  // Audio source state
  const [audioType, setAudioType] = useState<'file' | 'url' | 'tts'>('file');
  const [audioUrlInput, setAudioUrlInput] = useState('');
  const [selectedAudioFile, setSelectedAudioFile] = useState<File | null>(null);

  // Text source state
  const [rawTextInput, setRawTextInput] = useState('');
  const [isParsingPdf, setIsParsingPdf] = useState(false);
  const [estimatedDuration, setEstimatedDuration] = useState<number>(120);

  // PDF preserved state
  const [uploadedPdfUrl, setUploadedPdfUrl] = useState<string | undefined>(undefined);
  const [uploadedPdfPageCount, setUploadedPdfPageCount] = useState<number | undefined>(undefined);
  const [uploadedPdfSegments, setUploadedPdfSegments] = useState<Omit<ParagraphSegment, 'id' | 'startTime'>[]>([]);

  const [activeTab, setActiveTab] = useState<'create' | 'json'>('create');
  const [jsonInput, setJsonInput] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  // Handle local audio file selection
  const handleAudioFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedAudioFile(file);
      if (!title) {
        const cleanName = file.name.replace(/\.[^/.]+$/, '');
        setTitle(cleanName);
      }

      const audioObj = new Audio();
      audioObj.src = URL.createObjectURL(file);
      audioObj.onloadedmetadata = () => {
        if (audioObj.duration && !isNaN(audioObj.duration)) {
          setEstimatedDuration(Math.round(audioObj.duration));
        }
      };
    }
  };

  // Handle local text or PDF file selection
  const handleTextFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setErrorMsg('');

      if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
        setIsParsingPdf(true);
        try {
          const res = await parsePdfFile(file);
          if (!res.extractedText.trim()) {
            setErrorMsg('PDF 解析成功但未提取到纯文本，该文件可能是单纯扫描版图片 PDF');
          } else {
            setUploadedPdfUrl(res.pdfUrl);
            setUploadedPdfPageCount(res.pageCount);
            setUploadedPdfSegments(res.segments);
            setRawTextInput(res.extractedText);
            if (!title) {
              setTitle(file.name.replace(/\.pdf$/i, ''));
            }
          }
        } catch (err: any) {
          setErrorMsg(err?.message || '解析 PDF 失败');
        } finally {
          setIsParsingPdf(false);
        }
      } else {
        // Reset PDF state for plain text files
        setUploadedPdfUrl(undefined);
        setUploadedPdfPageCount(undefined);
        setUploadedPdfSegments([]);

        const reader = new FileReader();
        reader.onload = (event) => {
          if (event.target?.result) {
            setRawTextInput(event.target.result as string);
            if (!title) {
              setTitle(file.name.replace(/\.[^/.]+$/, ''));
            }
          }
        };
        reader.readAsText(file);
      }
    }
  };

  // Submit and create new track
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!title.trim()) {
      setErrorMsg('请填写标题名称');
      return;
    }

    if (!rawTextInput.trim()) {
      setErrorMsg('请粘贴或上传文稿文本内容');
      return;
    }

    let audioUrl = '';
    let isBlobUrl = false;
    let isTTS = false;

    if (audioType === 'file') {
      if (!selectedAudioFile) {
        setErrorMsg('请选择本地音频文件，或切换至音频链接/语音合成模式');
        return;
      }
      audioUrl = URL.createObjectURL(selectedAudioFile);
      isBlobUrl = true;
    } else if (audioType === 'url') {
      if (!audioUrlInput.trim()) {
        setErrorMsg('请输入有效的音频 URL 链接 (MP3/WAV等)');
        return;
      }
      audioUrl = audioUrlInput.trim();
    } else if (audioType === 'tts') {
      isTTS = true;
      audioUrl = 'tts://speech';
    }

    // Parse segments from text input
    let segments = parseTextToSegments(rawTextInput, estimatedDuration);

    if (segments.length === 0) {
      setErrorMsg('未能从文稿中解析出段落内容，请检查文本格式');
      return;
    }

    // Attach PDF page metadata if available
    if (uploadedPdfSegments.length > 0) {
      segments = segments.map((seg, idx) => {
        const matched = uploadedPdfSegments[idx] || uploadedPdfSegments[Math.min(idx, uploadedPdfSegments.length - 1)];
        return {
          ...seg,
          pdfPage: matched ? matched.pdfPage : 1,
        };
      });
    }

    const newTrack: Track = {
      id: `custom-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      title: title.trim(),
      author: author.trim() || '自定义作者',
      category,
      description: description.trim() || (uploadedPdfUrl ? '导入的 PDF 完整原貌排版音频项目' : '用户自定义音频文本内容'),
      audioUrl,
      isBlobUrl,
      isTTS,
      duration: estimatedDuration,
      segments,
      createdAt: Date.now(),
      coverImage: 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?q=80&w=800&auto=format&fit=crop',
      pdfUrl: uploadedPdfUrl,
      pdfPageCount: uploadedPdfPageCount,
    };

    onAddTrack(newTrack);
    onClose();
  };

  // Handle Json import
  const handleJsonSubmit = () => {
    if (!jsonInput.trim()) return;
    try {
      onImportJson(jsonInput);
      onClose();
    } catch (err) {
      setErrorMsg('JSON 格式解析失败，请检查数据结构');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden text-slate-900 dark:text-slate-100">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <FolderPlus className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-bold">添加新音频与文本 / PDF 原貌</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5 opacity-60" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-4 pt-2 gap-2 text-xs font-medium">
          <button
            onClick={() => setActiveTab('create')}
            className={`pb-2.5 px-3 border-b-2 transition-all ${
              activeTab === 'create'
                ? 'border-blue-600 text-blue-600 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            上传/新建项目
          </button>
          <button
            onClick={() => setActiveTab('json')}
            className={`pb-2.5 px-3 border-b-2 transition-all ${
              activeTab === 'json'
                ? 'border-blue-600 text-blue-600 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            导入 JSON 导出的包
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 text-xs font-medium">
              ⚠️ {errorMsg}
            </div>
          )}

          {activeTab === 'create' ? (
            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              {/* Basic Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">
                    标题名称 *
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="例如：荷塘月色 / 英语演讲 / 商业讲座"
                    className="w-full p-2.5 border rounded-xl bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">
                    作者 / 讲者
                  </label>
                  <input
                    type="text"
                    value={author}
                    onChange={(e) => setAuthor(e.target.value)}
                    placeholder="例如：朱自清 / Steve Jobs"
                    className="w-full p-2.5 border rounded-xl bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">
                    分类标签
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full p-2.5 border rounded-xl bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="经典散文">经典散文</option>
                    <option value="英语演讲">英语演讲</option>
                    <option value="知识科普">知识科普</option>
                    <option value="故事电台">故事电台</option>
                    <option value="学术论文">学术论文</option>
                    <option value="PDF文档">PDF文档</option>
                    <option value="自定义">自定义</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">
                    预计时长 (秒)
                  </label>
                  <input
                    type="number"
                    value={estimatedDuration}
                    onChange={(e) => setEstimatedDuration(Number(e.target.value))}
                    placeholder="默认120秒"
                    className="w-full p-2.5 border rounded-xl bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Audio Source Selector */}
              <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <label className="block font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Music className="w-4 h-4 text-blue-500" />
                  音频来源 *
                </label>

                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setAudioType('file')}
                    className={`p-2.5 rounded-xl border text-center transition-all ${
                      audioType === 'file'
                        ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-500 text-blue-600 dark:text-blue-400 font-bold'
                        : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    本地音频文件
                  </button>
                  <button
                    type="button"
                    onClick={() => setAudioType('url')}
                    className={`p-2.5 rounded-xl border text-center transition-all ${
                      audioType === 'url'
                        ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-500 text-blue-600 dark:text-blue-400 font-bold'
                        : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    网络音频 URL
                  </button>
                  <button
                    type="button"
                    onClick={() => setAudioType('tts')}
                    className={`p-2.5 rounded-xl border text-center transition-all ${
                      audioType === 'tts'
                        ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-500 text-blue-600 dark:text-blue-400 font-bold'
                        : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    AI 语音合成朗读
                  </button>
                </div>

                {audioType === 'file' && (
                  <div className="p-3 border border-dashed rounded-xl bg-slate-50 dark:bg-slate-800/50 text-center">
                    <input
                      type="file"
                      accept="audio/*"
                      onChange={handleAudioFileChange}
                      className="hidden"
                      id="audio-file-upload"
                    />
                    <label
                      htmlFor="audio-file-upload"
                      className="cursor-pointer flex flex-col items-center gap-1.5"
                    >
                      <Upload className="w-6 h-6 text-blue-500" />
                      <span className="font-semibold text-slate-700 dark:text-slate-300">
                        {selectedAudioFile ? selectedAudioFile.name : '点击选择本地 MP3/WAV/M4A 音频文件'}
                      </span>
                      <span className="text-[10px] text-slate-400">支持拖拽或直接点击选择</span>
                    </label>
                  </div>
                )}

                {audioType === 'url' && (
                  <input
                    type="url"
                    value={audioUrlInput}
                    onChange={(e) => setAudioUrlInput(e.target.value)}
                    placeholder="例如：https://example.com/audio.mp3"
                    className="w-full p-2.5 border rounded-xl bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                )}

                {audioType === 'tts' && (
                  <p className="text-[11px] text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 p-2 rounded-lg">
                    ✨ 已选择 AI 语音合成模式。系统将使用浏览器的 Web Speech 引擎自动根据文稿段落朗读！
                  </p>
                )}
              </div>

              {/* Text / PDF Source Upload */}
              <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <label className="block font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-blue-500" />
                    文稿内容 (文本 / 原版 PDF 文档 / LRC歌词 / SRT字幕) *
                  </label>
                  <label className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline cursor-pointer flex items-center gap-1">
                    {isParsingPdf ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-500" />
                        <span>正在解析 PDF 原件与排版...</span>
                      </>
                    ) : (
                      <>
                        <span>直接导入 PDF / TXT / LRC / SRT</span>
                        <input
                          type="file"
                          accept=".pdf,.txt,.lrc,.srt,.vtt,.md"
                          onChange={handleTextFileChange}
                          disabled={isParsingPdf}
                          className="hidden"
                        />
                      </>
                    )}
                  </label>
                </div>

                {uploadedPdfUrl && (
                  <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-[11px] flex items-center gap-2">
                    <FileCheck className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                    <span>
                      已导入 PDF 原版文件 (共 {uploadedPdfPageCount} 页)，系统将直接保留其原生美观排版与图像，并支持逐句高亮同步跟读！
                    </span>
                  </div>
                )}

                <textarea
                  value={rawTextInput}
                  onChange={(e) => setRawTextInput(e.target.value)}
                  placeholder="在此直接粘贴纯文本/LRC歌词/SRT字幕，或者点击右上角上传 PDF/TXT 文件..."
                  rows={6}
                  className="w-full p-3 border rounded-xl bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 leading-relaxed text-xs"
                  required
                />
              </div>

              {/* Submit Buttons */}
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={isParsingPdf}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold flex items-center gap-1.5 shadow-md shadow-blue-500/20 disabled:opacity-50"
                >
                  <Plus className="w-4 h-4" />
                  <span>添加至项目库</span>
                </button>
              </div>
            </form>
          ) : (
            /* JSON Import Tab */
            <div className="space-y-4 text-xs">
              <p className="text-slate-600 dark:text-slate-400">
                请将由本应用或其他工具导出的 Track 项目 JSON 字符串粘贴至下方框中：
              </p>
              <textarea
                value={jsonInput}
                onChange={(e) => setJsonInput(e.target.value)}
                placeholder='{"id": "...", "title": "...", "segments": [...]}'
                rows={10}
                className="w-full p-3 border rounded-xl bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
              />
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={handleJsonSubmit}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold flex items-center gap-1.5 shadow-md shadow-blue-500/20"
                >
                  <Upload className="w-4 h-4" />
                  <span>确认导入 JSON</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
