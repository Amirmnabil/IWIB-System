
import React from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';

export const Logo = React.memo(function Logo(props: Partial<React.ComponentProps<typeof Image>>) {
  return (
    <Image
      src="/iwib-logo-new.png"
      alt="IWIB Hub Logo"
      width={128}
      height={128}
      priority
      {...props}
      className={cn("object-contain", props.className)}
    />
  );
});
