import { useEffect } from 'react';
import { usePageTitleStore } from '@/store/pageTitleStore';

/**
 * Хук для установки заголовка страницы на мобильной версии
 * Название будет отображаться в Header компоненте
 */
export const usePageTitle = (title, isMobile) => {
  const { setPageTitle } = usePageTitleStore();

  useEffect(() => {
    if (isMobile) {
      setPageTitle(title);
    }
    
    return () => {
      if (isMobile) {
        setPageTitle(null);
      }
    };
  }, [title, isMobile, setPageTitle]);
};

