import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { ProductsPage } from './ProductsPage';
import { api } from '../services/api';
import { Category } from '../types';
import { useCatalogSync } from '../hooks/useCatalogSync';

export const CategoryPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [category, setCategory] = useState<Category | null>(null);

  const fetchCategory = () => {
    if (slug) {
      api.categories.getBySlug(slug)
        .then(res => setCategory(res.category))
        .catch(() => setCategory(null));
    }
  };

  useEffect(() => {
    fetchCategory();
  }, [slug]);

  // Synchronize category details live
  useCatalogSync(() => {
    fetchCategory();
  }, [slug]);

  return (
    <ProductsPage
      fixedCategorySlug={slug}
      categoryTitle={category ? category.name : undefined}
    />
  );
};
