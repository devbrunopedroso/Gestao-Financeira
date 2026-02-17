'use client'

import { UseFormRegisterReturn, FieldError } from 'react-hook-form'

interface FormSelectProps {
  label: string
  register: UseFormRegisterReturn
  error?: FieldError
  options: { value: string; label: string }[]
  placeholder?: string
}

export function FormSelect({ label, register, error, options, placeholder }: FormSelectProps) {
  return (
    <div className="mb-4">
      <label className="block text-sm font-medium mb-2">{label}</label>
      <select
        {...register}
        className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
          error ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
        }`}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && <p className="mt-1 text-sm text-red-500">{error.message}</p>}
    </div>
  )
}

