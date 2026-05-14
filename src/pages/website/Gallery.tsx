import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Image as ImageIcon, Plus } from 'lucide-react';

interface GalleryItem {
  id: string;
  url: string;
  title: string;
  category: string;
}

export default function Gallery() {
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    const fetchGallery = async () => {
      try {
        const response = await fetch('/api/website/gallery');
        const data = await response.json();
        setItems(Array.isArray(data) ? data.map((item: any) => ({ ...item, id: item._id })) : []);
      } catch (error) {
        console.error("Error fetching gallery:", error);
      }
    };
    fetchGallery();
  }, []);

  const categories = ['all', 'campus', 'events', 'academic', 'sports'];
  const filteredItems = filter === 'all' ? items : items.filter(item => item.category === filter);

  return (
    <div className="py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-20 space-y-4">
          <h1 className="text-5xl font-extrabold text-gray-900 tracking-tight">Our Gallery</h1>
          <p className="text-gray-500 text-xl font-medium">Capturing the vibrant moments and experiences at our institution.</p>
        </div>

        {/* Filter */}
        <div className="flex flex-wrap justify-center gap-4 mb-16">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className={`px-8 py-3 rounded-full text-[11px] font-bold uppercase tracking-widest transition-all ${
                filter === cat 
                  ? 'bg-primary text-white shadow-lg shadow-primary/25' 
                  : 'bg-white text-gray-500 hover:bg-gray-100 border border-gray-100'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredItems.length > 0 ? filteredItems.map((item, i) => (
            <motion.div
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              key={item.id}
              className="group relative h-80 rounded-[40px] overflow-hidden border border-gray-100 shadow-xl shadow-gray-200/20"
            >
              <img 
                src={item.url} 
                alt={item.title} 
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-gray-900/90 via-gray-900/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-8">
                <p className="text-primary font-bold uppercase tracking-widest text-[10px] mb-2">{item.category}</p>
                <h3 className="text-xl font-bold text-white tracking-tight">{item.title}</h3>
              </div>
            </motion.div>
          )) : (
            <div className="col-span-3 text-center py-40">
               <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center text-gray-300 mx-auto mb-6">
                < ImageIcon className="w-10 h-10" />
               </div>
               <p className="text-gray-400 font-bold uppercase tracking-widest text-sm">No photos found in this category</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
