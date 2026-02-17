'use client'

import { UseFormRegisterReturn, FieldError } from 'react-hook-form'

interface FormInputProps {
  label: string
  type?: string
  register: UseFormRegisterReturn
  error?: FieldError
  placeholder?: string
  step?: string
  min?: string
}

export function FormInput({ label, type = 'text', register, error, placeholder, step, min }: FormInputProps) {
  return (
    <div className="mb-4">
      <label className="block text-sm font-medium mb-2">{label}</label>
      <input
        type={type}
        {...register}
        placeholder={placeholder}
        step={step}
        min={min}
        className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
          error ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
        }`}
      />
      {error && <p className="mt-1 text-sm text-red-500">{error.message}</p>}
    </div>
  )
}

