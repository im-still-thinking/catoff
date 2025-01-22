import { X } from 'lucide-react';

export default function ErrorModal({ 
  isOpen, 
  onClose, 
  message 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  message: string;
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white/10 backdrop-blur-lg rounded-xl border-t-[1px] border-l-[1px] border-t-white/50 border-l-white/50 shadow-lg p-6 max-w-md w-11/12 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-white hover:text-red-500 transition-colors"
        >
          <X size={24} />
        </button>
        
        <h3 className="text-2xl font-supercell text-white mb-4 text-center">
          Error
        </h3>
        
        <div className="text-white font-supercell text-center mb-6">
          {message}
        </div>
        
        <div className="flex justify-center">
          <button
            onClick={onClose}
            className="bg-red-500 hover:bg-red-600 text-white font-supercell px-6 py-2 rounded-lg transition-colors"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}