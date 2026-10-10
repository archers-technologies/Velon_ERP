import { cn } from '@/lib/utils';
import markPrimary from '@/Logo assets/01 VelonERP logo - Primary.svg';
import markBlack from '@/Logo assets/02 VelonERP logo - Black.svg';
import markWhite from '@/Logo assets/03 VelonERP logo - white.svg';
import navPrimary from '@/Logo assets/04 VelonERP logo - navbar - primary.svg';
import navBlack from '@/Logo assets/05 VelonERP logo - navbar - black.svg';
import navWhite from '@/Logo assets/06 VelonERP logo - navbar - white.svg';
import footerPrimary from '@/Logo assets/10 VelonERP logo - footer - primary.svg';
import footerBlack from '@/Logo assets/11 VelonERP logo - footer - black.svg';
import footerWhite from '@/Logo assets/12 VelonERP logo - footer - white.svg';

export type VelonLogoSlot = 'mark' | 'navbar' | 'footer';
export type VelonLogoTone = 'primary' | 'black' | 'white' | 'auto';
export type VelonLogoSize = 'xs' | 'sm' | 'md' | 'lg';

const ASSETS: Record<VelonLogoSlot, Record<Exclude<VelonLogoTone, 'auto'>, string>> = {
  mark: { primary: markPrimary, black: markBlack, white: markWhite },
  navbar: { primary: navPrimary, black: navBlack, white: navWhite },
  footer: { primary: footerPrimary, black: footerBlack, white: footerWhite },
};

const SIZE: Record<VelonLogoSlot, Record<VelonLogoSize, string>> = {
  mark: {
    xs: 'h-6 w-6',
    sm: 'h-8 w-8',
    md: 'h-11 w-11',
    lg: 'h-14 w-14',
  },
  navbar: {
    xs: 'h-6 w-auto',
    sm: 'h-7 w-auto',
    md: 'h-9 w-auto',
    lg: 'h-11 w-auto',
  },
  footer: {
    xs: 'h-14 w-auto',
    sm: 'h-16 w-auto',
    md: 'h-20 w-auto',
    lg: 'h-24 w-auto',
  },
};

type VelonLogoProps = {
  slot?: VelonLogoSlot;
  /** `auto` uses the primary lockup on light surfaces and the white lockup in dark mode. */
  tone?: VelonLogoTone;
  size?: VelonLogoSize;
  alt?: string;
  className?: string;
};

export function VelonLogo({
  slot = 'mark',
  tone = 'auto',
  size = 'sm',
  alt = 'Velon ERP',
  className,
}: VelonLogoProps) {
  const frame = SIZE[slot][size];

  if (tone === 'auto') {
    return (
      <>
        <img
          src={ASSETS[slot].primary}
          alt={alt}
          className={cn(frame, 'object-contain dark:hidden', className)}
        />
        <img
          src={ASSETS[slot].white}
          alt={alt}
          className={cn(frame, 'hidden object-contain dark:block', className)}
        />
      </>
    );
  }

  return (
    <img
      src={ASSETS[slot][tone]}
      alt={alt}
      className={cn(frame, 'object-contain', className)}
    />
  );
}
