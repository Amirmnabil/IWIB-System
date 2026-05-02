
import React from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';

export const Logo = React.memo(function Logo(props: Partial<React.ComponentProps<typeof Image>>) {
  return (
    <Image
      src="https://i.ibb.co/9kNsx3NZ/IWib-logo-V01.png"
      alt="IWIB Hub Logo"
      width={128}
      height={128}
      priority
      {...props}
      className={cn("object-contain", props.className)}
    />
  );
});
