import React from 'react';
import { X } from 'lucide-react';

export default function ConfirmDialog({ open, title, message, confirmText = 'Confirm', cancelText = 'Cancel', danger = false, onConfirm, onCancel }) {
    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
                <div className="flex items-start justify-between p-6 border-b">
                    <div>
                        <h3 className="text-lg font-bold">{title}</h3>
                        <p className="text-sm text-slate-500 mt-1">{message}</p>
                    </div>
                    <button onClick={onCancel} className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center">
                        <X className="w-4 h-4 text-gray-600" />
                    </button>
                </div>

                <div className="p-6 flex justify-end gap-3">
                    <button onClick={onCancel} className="px-4 py-2 rounded-lg bg-gray-100 text-gray-700">{cancelText}</button>
                    <button onClick={onConfirm} className={`px-4 py-2 rounded-lg text-white ${danger ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}`}>{confirmText}</button>
                </div>
            </div>
        </div>
    );
}
