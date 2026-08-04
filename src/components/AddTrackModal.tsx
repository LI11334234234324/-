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
} from 'lucide-react';
import { Track } from '../types';
import { parseTextToSegments } from '../utils/lrcParser';

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
  const [estimatedDuration, setEstimatedDuration] = useState<number>(120);

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
        // Auto set title from file name
        const cleanName = file.name.replace(/\.[^/.]+$/, '');
        setTitle(cleanName);
      }

      // Try to get audio duration
      const audioObj = new Audio();
      audioObj.src = URL.createObjectURL(file);
      audioObj.onloadedmetadata = () => {
        if (audioObj.duration && !isNaN(audioObj.duration)) {
          setEstimatedDuration(Math.round(audioObj.duration));
        }
      };
    }
  };

  // Handle local text file selection (.txt, .lrc, .srt)
  const handleTextFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setRawTextInput(event.target.result as string);
        }
      };
      reader.readAsText(file);
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
    const segments = parseTextToSegments(rawTextInput, estimatedDuration);

    if (segments.length === 0) {
      setErrorMsg('未能从文稿中解析出段落内容，请检查文本格式');
      return;
    }

    const newTrack: Track = {
      id: `custom-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      title: title.trim(),
      author: author.trim() || '自定义作者',
      category,
      description: description.trim() || '用户自定义音频文本内容',
      audioUrl,
      isBlobUrl,
      isTTS,
      duration: estimatedDuration,
      segments,
      createdAt: Date.now(),
      coverImage: 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?q=80&w=800&auto=format&fit=crop',
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
            <h3 className="text-lg font-bold">添加新音频与文本</h3>
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
                  <label className="block font-semibold mb-1">作品标题 *</label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="例：《荷塘月色》或 BBC 听力第11期"
                    className="w-full p-2.5 rounded-xl border bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">作者 / 主讲人</label>
                  <input
                    type="text"
                    value={author}
                    onChange={(e) => setAuthor(e.target.value)}
                    placeholder="例：朱自清 / Steve Jobs"
                    className="w-full p-2.5 rounded-xl border bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold mb-1">分类标签</label>
                <div className="flex flex-wrap gap-2">
                  {['文学散文', '英语演讲', '知识科普', '故事电台', '个人笔记', '自定义'].map((cat) => (
                    <button
                      type="button"
                      key={cat}
                      onClick={() => setCategory(cat)}
                      className={`px-3 py-1.5 rounded-lg border text-xs transition-all ${
                        category === cat
                          ? 'bg-blue-600 text-white font-bold border-blue-600'
                          : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Step 1: Audio Source Selection */}
              <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 space-y-3">
                <label className="block font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Music className="w-4 h-4 text-blue-500" />
                  音频来源设置
                </label>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setAudioType('file')}
                    className={`flex-1 py-2 px-3 rounded-xl border text-xs font-medium flex items-center justify-center gap-1.5 transition-all ${
                      audioType === 'file'
                        ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-500 text-blue-600 font-bold'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    <Upload className="w-3.5 h-3.5" /> 本地 MP3 文件
                  </button>

                  <button
                    type="button"
                    onClick={() => setAudioType('url')}
                    className={`flex-1 py-2 px-3 rounded-xl border text-xs font-medium flex items-center justify-center gap-1.5 transition-all ${
                      audioType === 'url'
                        ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-500 text-blue-600 font-bold'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    <Link className="w-3.5 h-3.5" /> 音频 URL 链接
                  </button>

                  <button
                    type="button"
                    onClick={() => setAudioType('tts')}
                    className={`flex-1 py-2 px-3 rounded-xl border text-xs font-medium flex items-center justify-center gap-1.5 transition-all ${
                      audioType === 'tts'
                        ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-500 text-blue-600 font-bold'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" /> 语音合成 (TTS)
                  </button>
                </div>

                {audioType === 'file' && (
                  <div className="space-y-1">
                    <input
                      type="file"
                      accept="audio/*,.mp3,.wav,.ogg,.m4a,.aac"
                      onChange={handleAudioFileChange}
                      className="block w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700 cursor-pointer"
                    />
                    {selectedAudioFile && (
                      <p className="text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1 mt-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> 已选择: {selectedAudioFile.name} ({(selectedAudioFile.size / 1024 / 1024).toFixed(2)} MB)
                      </p>
                    )}
                  </div>
                )}

                {audioType === 'url' && (
                  <input
                    type="url"
                    value={audioUrlInput}
                    onChange={(e) => setAudioUrlInput(e.target.value)}
                    placeholder="https://example.com/audio.mp3"
                    className="w-full p-2.5 rounded-xl border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                )}

                {audioType === 'tts' && (
                  <p className="text-[11px] opacity-75">
                    无音频文件时，系统将使用浏览器原生 TTS 引擎根据文字内容自动朗读语音！
                  </p>
                )}
              </div>

              {/* Step 2: Text / Transcript Input */}
              <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-blue-500" />
                    文稿内容 (文本 / LRC歌词 / SRT字幕) *
                  </label>
                  <label className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline cursor-pointer">
                    上传 .txt / .lrc / .srt 文件
                    <input
                      type="file"
                      accept=".txt,.lrc,.srt,.vtt,.md"
                      onChange={handleTextFileChange}
                      className="hidden"
                    />
                  </label>
                </div>

                <textarea
                  required
                  value={rawTextInput}
                  onChange={(e) => setRawTextInput(e.target.value)}
                  placeholder={`粘贴文本内容，支持：
1. 普通文字段落（空行分隔段落）
2. LRC 时间戳格式（如 [00:15.20] 第一句内容）
3. SRT 字幕格式或【角色/朗读】：标记`}
                  rows={6}
                  className="w-full p-3 rounded-xl border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-xs leading-relaxed"
                />

                <div className="flex items-center justify-between text-[11px] text-slate-500">
                  <span>支持自动智能切分段落与解析说话人角色</span>
                  <span>已输入 {rawTextInput.length} 个字符</span>
                </div>
              </div>

              {/* Submit Button */}
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 shadow-md transition-transform active:scale-95"
                >
                  创建并存入库
                </button>
              </div>
            </form>
          ) : (
            /* JSON Import tab */
            <div className="space-y-4 text-xs">
              <p className="text-slate-600 dark:text-slate-400">
                在此粘贴先前导出的音频文稿 JSON 数据代码包，一键恢复导入全套文本、时间戳与标签。
              </p>
              <textarea
                value={jsonInput}
                onChange={(e) => setJsonInput(e.target.value)}
                placeholder='粘贴 {"id": "...", "title": "...", "segments": [...]} JSON 代码'
                rows={10}
                className="w-full p-3 rounded-xl border bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
              />
              <div className="flex justify-end gap-2">
                <button
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl border text-slate-600 dark:text-slate-400 hover:bg-slate-100"
                >
                  取消
                </button>
                <button
                  onClick={handleJsonSubmit}
                  className="px-5 py-2 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 shadow-md"
                >
                  解析并导入包
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
