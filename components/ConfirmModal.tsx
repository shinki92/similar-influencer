"use client";

interface ConfirmModalProps {
  isOpen: boolean;
  username: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmModal({
  isOpen,
  username,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md mx-4">
        <h3 className="text-xl font-bold text-center mb-3">
          유사 계정 추가 검색
        </h3>
        <p className="text-gray-600 text-center mb-6">
          &apos;{username}&apos; 계정과 유사한 계정을 추가로 검색하시겠어요?
        </p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-3 border border-gray-300 rounded-xl font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
          >
            취소
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-3 bg-[#2AABE2] text-white rounded-xl font-semibold hover:bg-[#1a9ad1] transition-colors"
          >
            확인
          </button>
        </div>
      </div>
    </div>
  );
}
