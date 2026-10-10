import {
  VelonLogo,
  type VelonLogoSize,
  type VelonLogoTone,
} from '@/components/marketing/velon-logo';
import { cn } from '@/lib/utils';

type VelonLogoMarkProps = React.HTMLAttributes<HTMLSpanElement> & {
  size?: VelonLogoSize;
  /** `default` follows the page theme. `platform` and `sidebar` sit on navy, so they use the white mark. */
  variant?: 'default' | 'platform' | 'sidebar';
};

const TONE: Record<NonNullable<VelonLogoMarkProps['variant']>, VelonLogoTone> = {
  default: 'auto',
  platform: 'white',
  sidebar: 'white',
};

export function VelonLogoMark({
  size = 'sm',
  variant = 'default',
  className,
  ...props
}: VelonLogoMarkProps) {
  return (
    <span
      className={cn('inline-flex shrink-0 items-center justify-center', className)}
      {...props}
    >
      <VelonLogo
        slot="mark"
        tone={TONE[variant]}
        size={size}
        alt=""
      />
    </span>
  );
}
