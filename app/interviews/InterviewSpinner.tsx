type Props = {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export default function InterviewSpinner({ size = 'md', className = '' }: Props) {
  const sizeClass = size === 'sm' ? 'h-5 w-5' : size === 'lg' ? 'h-12 w-12' : 'h-8 w-8'

  return (
    <div
      className={`animate-spin rounded-full border-b-2 border-indigo-600 ${sizeClass} ${className}`}
      role="status"
      aria-label="Loading"
    />
  )
}
