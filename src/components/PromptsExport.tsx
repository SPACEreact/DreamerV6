import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ClipboardCopy, Download, ExternalLink, Check, Share2 } from 'lucide-react';

interface PromptsExportProps {
  promptData: any;
  visualSettings?: any;
  metadata?: any;
  finalPromptText?: string;
}

export const PromptsExport: React.FC<PromptsExportProps> = ({
  promptData,
  visualSettings,
  metadata,
  finalPromptText
}) => {
  const [copied, setCopied] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const [showShareUrl, setShowShareUrl] = useState(false);

  const handleCopyPrompt = async () => {
    if (!finalPromptText) {
      // No final prompt text available
      return;
    }

    try {
      await navigator.clipboard.writeText(finalPromptText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      // Failed to copy
    }
  };

  const handleExportConfig = () => {
    const config = {
      version: '1.0',
      timestamp: new Date().toISOString(),
      promptData,
      visualSettings: visualSettings || {},
      metadata: metadata || {},
      finalPrompt: finalPromptText || ''
    };

    const blob = new Blob([JSON.stringify(config, null, 2)], {
      type: 'application/json'
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dreamer-prompt-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleSharePrompt = async () => {
    try {
      // Create a shareable configuration
      const config = {
        v: '1.0', // version
        d: btoa(JSON.stringify({
          promptData,
          visualSettings: visualSettings || {},
          finalPrompt: finalPromptText || ''
        }))
      };

      // Create URL with config as query parameter
      const baseUrl = window.location.origin + window.location.pathname;
      const params = new URLSearchParams();
      params.set('shared', config.d);
      const url = `${baseUrl}?${params.toString()}`;

      // Copy to clipboard
      await navigator.clipboard.writeText(url);
      setShareUrl(url);
      setShowShareUrl(true);

        setTimeout(() => {
          setShowShareUrl(false);
        }, 5000);
      }
    } catch (err) {
      // Failed to create share URL
    }
  };

  const handleDuplicatePrompt = () => {
    // Store current prompt in local storage for duplication
    const duplicateKey = `dreamer_duplicate_${Date.now()}`;
    localStorage.setItem(duplicateKey, JSON.stringify({
      promptData,
      visualSettings: visualSettings || {},
      metadata: metadata || {},
      timestamp: new Date().toISOString()
    }));

    // Trigger a custom event that the app can listen to
    window.dispatchEvent(new CustomEvent('dreamer:duplicate', {
      detail: { key: duplicateKey }
    }));

    alert('Prompt duplicated! You can now modify this copy independently.');
  };

  return (
    <div className="space-y-4">
      {/* Main export buttons */}
      <div className="flex flex-wrap gap-3">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleCopyPrompt}
          disabled={!finalPromptText}
          className={`
            flex items-center gap-2 px-5 py-3 rounded-lg font-medium transition-all
            ${copied
              ? 'bg-green-600 hover:bg-green-500'
              : 'bg-gray-800 hover:bg-gray-700 border border-gray-700'
            }
            disabled:opacity-50 disabled:cursor-not-allowed
          `}
        >
          {copied ? (
            <>
              <Check className="w-4 h-4" />
              <span>Copied!</span>
            </>
          ) : (
            <>
              <ClipboardCopy className="w-4 h-4" />
              <span>Copy Prompt</span>
            </>
          )}
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleExportConfig}
          className="flex items-center gap-2 px-5 py-3 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg font-medium transition-colors"
        >
          <Download className="w-4 h-4" />
          <span>Export Config</span>
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleSharePrompt}
          className="flex items-center gap-2 px-5 py-3 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg font-medium transition-colors"
        >
          <Share2 className="w-4 h-4" />
          <span>Share Link</span>
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleDuplicatePrompt}
          className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 rounded-lg font-medium transition-colors"
        >
          <ExternalLink className="w-4 h-4" />
          <span>Duplicate Prompt</span>
        </motion.button>
      </div>

      {/* Share URL display */}
      {showShareUrl && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className="bg-gray-800 border border-gray-700 rounded-lg p-4"
        >
          <div className="flex items-start gap-3">
            <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-white mb-2">
                Share link copied to clipboard!
              </div>
              <div className="bg-gray-900 border border-gray-700 rounded px-3 py-2 text-sm text-gray-400 font-mono break-all">
                {shareUrl}
              </div>
              <div className="text-xs text-gray-500 mt-2">
                Anyone with this link can import your prompt configuration
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Export info */}
      <div className="text-sm text-gray-500 space-y-1">
        <div className="flex items-center gap-2">
          <ClipboardCopy className="w-3.5 h-3.5" />
          <span>Copy the final generated prompt text</span>
        </div>
        <div className="flex items-center gap-2">
          <Download className="w-3.5 h-3.5" />
          <span>Export full configuration as JSON file</span>
        </div>
        <div className="flex items-center gap-2">
          <Share2 className="w-3.5 h-3.5" />
          <span>Generate shareable URL with prompt data</span>
        </div>
        <div className="flex items-center gap-2">
          <ExternalLink className="w-3.5 h-3.5" />
          <span>Create a duplicate to modify separately</span>
        </div>
      </div>

      {/* Preview of final prompt */}
      {finalPromptText && (
        <div className="mt-6">
          <div className="text-sm font-medium text-gray-400 mb-2">Final Prompt Preview:</div>
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 max-h-64 overflow-y-auto">
            <pre className="text-sm text-gray-300 whitespace-pre-wrap font-mono leading-relaxed">
              {finalPromptText}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};

export default PromptsExport;
