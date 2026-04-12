import { useTheme } from '@/app/ThemeProvider';
import { cn } from '@/lib/cn';

type AppLogoProps = {
  className?: string;
  alt?: string;
};

export function AppLogo({ className, alt = 'Eagle-Foundry' }: AppLogoProps): JSX.Element {
  const { resolved } = useTheme();
  const src = resolved === 'light' ? '/assets/brand/logo-light-512.png' : '/assets/brand/logo-dark-512.png';
  return <img src={src} alt={alt} className={cn(className)} />;
}
