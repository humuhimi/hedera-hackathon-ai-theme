interface StepIndicatorProps {
  step: number;
  currentStep: number;
  label: string;
  isError?: boolean;
}

export function StepIndicator({
  step,
  currentStep,
  label,
  isError
}: StepIndicatorProps) {
  const isComplete = currentStep > step;
  const isActive = currentStep === step;

  return (
    <div className="flex items-center gap-3">
      <div className={`
        w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold
        ${isError && isActive ? 'bg-red-100 text-red-600 border-2 border-red-600' : ''}
        ${isComplete ? 'bg-green-600 text-white' : ''}
        ${isActive && !isError ? 'bg-green-100 text-green-600 border-2 border-green-600' : ''}
        ${!isComplete && !isActive ? 'bg-gray-100 text-gray-400' : ''}
      `}>
        {isComplete ? '✓' : isError && isActive ? '!' : step}
      </div>
      <span className={`text-sm ${isActive ? 'font-semibold text-gray-900' : 'text-gray-600'}`}>
        {label}
      </span>
      {isActive && !isComplete && !isError && (
        <div className="animate-spin rounded-full h-4 w-4 border-2 border-green-600 border-t-transparent ml-2"></div>
      )}
    </div>
  );
}
