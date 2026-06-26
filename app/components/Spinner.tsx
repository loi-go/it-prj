import Image from 'next/image'
import spinnerImage from '@/Spinner.png'

type Props = {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

const sizeClass: Record<NonNullable<Props['size']>, string> = {
  xs: 'h-4 w-4',
  sm: 'h-6 w-6',
  md: 'h-8 w-8',
  lg: 'h-12 w-12',
  xl: 'h-16 w-16',
}

export default function Spinner({ size = 'md', className = '' }: Props) {
  return (
    <div
      className={`inline-flex shrink-0 items-center justify-center animate-rrr-dash ${sizeClass[size]} ${className}`}
      role="status"
      aria-label="Loading"
    >
      <Image
        src={spinnerImage}
        alt=""
        className="h-full w-full object-contain"
        aria-hidden
      />
    </div>
  )
}
