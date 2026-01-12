
import React from 'react';

interface ExternalLinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  href: string;
  children: React.ReactNode;
}

export const ExternalLink: React.FC<ExternalLinkProps> = ({ href, children, className, onClick, ...props }) => {
  
  const handleClick = async (e: React.MouseEvent<HTMLAnchorElement>) => {
    // Preserve existing onClick handler if passed
    if (onClick) {
        onClick(e);
    }

    // Simple Tauri Detection
    // @ts-ignore
    const isTauri = typeof window !== 'undefined' && (window.__TAURI__ !== undefined || window.__TAURI_INTERNALS__ !== undefined);

    if (isTauri) {
      e.preventDefault();
      try {
        // @ts-ignore
        const shell = window.__TAURI__?.shell || window.__TAURI_INTERNALS__?.shell;
        if (shell) {
          // @ts-ignore
          await shell.open(href);
        } else {
          window.open(href, '_blank');
        }
      } catch (err) {
        console.warn("Tauri shell open failed, falling back to window.open.", err);
        window.open(href, '_blank');
      }
    }
    // If Web, default behavior (target="_blank") works fine
  };

  return (
    <a 
      href={href} 
      target="_blank" 
      rel="noopener noreferrer" 
      onClick={handleClick}
      className={className}
      {...props}
    >
      {children}
    </a>
  );
};
