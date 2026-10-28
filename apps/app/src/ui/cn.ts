import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/** Ghép lớp Tailwind, lớp sau thắng lớp trước cùng loại (quy ước của shadcn/ui). */
export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs))
