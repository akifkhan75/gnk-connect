import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface SavedItem {
  id: string;
  type: 'destination' | 'package' | 'service';
  title: string;
  category: string;
  image: string;
  price?: string;
  link?: string;
}

interface WishlistContextType {
  savedItems: SavedItem[];
  saveItem: (item: SavedItem) => void;
  removeItem: (id: string) => void;
  isSaved: (id: string) => boolean;
  toggleSave: (item: SavedItem) => void;
  clearWishlist: () => void;
  isDrawerOpen: boolean;
  setIsDrawerOpen: (open: boolean) => void;
}

const WishlistContext = createContext<WishlistContextType | undefined>(undefined);

const STORAGE_KEY = 'gnk_saved_travel_items';

export const WishlistProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [savedItems, setSavedItems] = useState<SavedItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(savedItems));
    } catch (e) {
      console.warn('Could not save wishlist to storage', e);
    }
  }, [savedItems]);

  const saveItem = (item: SavedItem) => {
    setSavedItems(prev => {
      if (prev.some(i => i.id === item.id)) return prev;
      return [...prev, item];
    });
  };

  const removeItem = (id: string) => {
    setSavedItems(prev => prev.filter(i => i.id !== id));
  };

  const isSaved = (id: string) => {
    return savedItems.some(i => i.id === id);
  };

  const toggleSave = (item: SavedItem) => {
    if (isSaved(item.id)) {
      removeItem(item.id);
    } else {
      saveItem(item);
    }
  };

  const clearWishlist = () => {
    setSavedItems([]);
  };

  return (
    <WishlistContext.Provider
      value={{
        savedItems,
        saveItem,
        removeItem,
        isSaved,
        toggleSave,
        clearWishlist,
        isDrawerOpen,
        setIsDrawerOpen
      }}
    >
      {children}
    </WishlistContext.Provider>
  );
};

export const useWishlist = (): WishlistContextType => {
  const context = useContext(WishlistContext);
  if (!context) {
    throw new Error('useWishlist must be used within a WishlistProvider');
  }
  return context;
};
