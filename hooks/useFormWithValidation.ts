'use client'

import { useForm, UseFormReturn } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import * as yup from 'yup'

export function useFormWithValidation<T extends yup.AnyObjectSchema>(
  schema: T
): UseFormReturn<yup.InferType<T>> {
  return useForm<yup.InferType<T>>({
    resolver: yupResolver(schema),
    mode: 'onChange',
  })
}

