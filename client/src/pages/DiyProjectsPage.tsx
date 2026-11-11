import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { Project } from '../types';
import { Cpu, Clock, Layers, Search, ArrowRight, Wrench, Sparkles, Filter, Code, CheckCircle2 } from 'lucide-react';

export const DiyProjectsPage: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedDifficulty, setSelectedDifficulty] = useState('All');

  useEffect(() => {
    fetchProjects();
  }, [selectedCategory, selectedDifficulty]);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (selectedCategory !== 'All') params.category = selectedCategory;
      if (selectedDifficulty !== 'All') params.difficulty = selectedDifficulty;
      if (search.trim()) params.search = search.trim();

      const res = await api.projects.getAll(params);
      setProjects(res.projects || []);
    } catch (err) {
      console.error('Failed to load DIY projects:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchProjects();
  };

  const categories = [
    'All',
    'IoT & Smart Agriculture',
    'IoT & Environmental',
    'Robotics & STEM',
    'Robotics & Wireless',
    'IoT & Security',
    'Home Automation',
    'Embedded Security',
    'Telemetry & IoT',
    'Power Electronics'
  ];

  const difficulties = ['All', 'Beginner', 'Intermediate', 'Advanced'];

  return (
    <div className="bg-[#eaeded] min-h-screen py-6 sm:py-8">
      <div className="max-w-[1400px] mx-auto px-4 space-y-6">
        
        {/* Hero Section */}
        <div className="bg-gradient-to-r from-gray-950 via-gray-900 to-amber-950 text-white rounded-xl p-6 sm:p-10 shadow-lg border border-amber-500/20 relative overflow-hidden">
          <div className="relative z-10 max-w-3xl space-y-3">
            <div className="inline-flex items-center space-x-2 bg-amber-500/20 text-amber-400 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border border-amber-500/30">
              <Sparkles size={14} />
              <span>VK Technology Innovation Hub</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
              DIY Electronics & Robotics Projects
            </h1>
            <p className="text-gray-300 text-sm sm:text-base leading-relaxed">
              Explore 13 engineering-grade DIY projects built around Arduino, ESP32, and Raspberry Pi. Complete with verified circuit schematics, source code, and plug-and-play component kits dispatched from Pedamiram, Andhra Pradesh.
            </p>
            <div className="pt-2 flex flex-wrap gap-4 text-xs text-amber-300 font-medium">
              <span className="flex items-center"><CheckCircle2 size={14} className="mr-1 text-emerald-400" /> Tested Schematics</span>
              <span className="flex items-center"><CheckCircle2 size={14} className="mr-1 text-emerald-400" /> Open-Source Code</span>
              <span className="flex items-center"><CheckCircle2 size={14} className="mr-1 text-emerald-400" /> Complete Hardware Kits</span>
            </div>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 space-y-3">
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
            {/* Search Input */}
            <form onSubmit={handleSearchSubmit} className="relative w-full sm:w-96">
              <input
                type="text"
                placeholder="Search projects (e.g. Irrigation, Robot, ESP32)..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-md text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
              <Search size={15} className="absolute left-3 top-2.5 text-gray-400" />
            </form>

            {/* Difficulty Tabs */}
            <div className="flex items-center space-x-1 overflow-x-auto w-full sm:w-auto text-xs font-bold">
              <span className="text-gray-500 mr-2 flex items-center shrink-0">
                <Filter size={13} className="mr-1" /> Difficulty:
              </span>
              {difficulties.map((diff) => (
                <button
                  key={diff}
                  onClick={() => setSelectedDifficulty(diff)}
                  className={`px-3 py-1.5 rounded-full transition whitespace-nowrap ${
                    selectedDifficulty === diff
                      ? 'bg-amber-500 text-gray-950 font-bold'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {diff}
                </button>
              ))}
            </div>
          </div>

          {/* Category Chips */}
          <div className="flex items-center space-x-1.5 overflow-x-auto pt-2 border-t border-gray-100 text-xs">
            <span className="text-gray-500 mr-2 shrink-0 font-medium">Category:</span>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1 rounded-md transition whitespace-nowrap text-xs ${
                  selectedCategory === cat
                    ? 'bg-gray-900 text-white font-bold'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Projects Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="bg-white rounded-lg p-4 shadow-sm border border-gray-200 animate-pulse space-y-3">
                <div className="w-full h-48 bg-gray-200 rounded"></div>
                <div className="w-3/4 h-5 bg-gray-200 rounded"></div>
                <div className="w-full h-12 bg-gray-100 rounded"></div>
              </div>
            ))}
          </div>
        ) : projects.length === 0 ? (
          <div className="bg-white p-12 text-center rounded-lg shadow-sm border border-gray-200 space-y-3">
            <Wrench size={40} className="mx-auto text-amber-500" />
            <h3 className="text-base font-bold text-gray-900">No DIY Projects match your filter</h3>
            <p className="text-xs text-gray-500">Try clearing filters or search with another term.</p>
            <button
              onClick={() => { setSelectedCategory('All'); setSelectedDifficulty('All'); setSearch(''); }}
              className="px-4 py-2 bg-amber-500 text-gray-950 font-bold rounded text-xs"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => (
              <div
                key={project.id}
                className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden flex flex-col hover:shadow-md transition-shadow group"
              >
                {/* Project Image */}
                <div className="relative h-48 bg-gray-100 overflow-hidden">
                  <img
                    src={project.image_url}
                    alt={project.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute top-2 left-2 flex gap-1.5 flex-wrap">
                    <span className="bg-black/75 backdrop-blur text-white text-[10px] font-bold px-2 py-0.5 rounded">
                      {project.category}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                      project.difficulty === 'Beginner' ? 'bg-emerald-600 text-white' :
                      project.difficulty === 'Intermediate' ? 'bg-amber-600 text-white' : 'bg-red-600 text-white'
                    }`}>
                      {project.difficulty}
                    </span>
                  </div>
                  {project.is_featured ? (
                    <span className="absolute top-2 right-2 bg-amber-500 text-gray-950 font-extrabold text-[10px] px-2 py-0.5 rounded shadow">
                      ★ Featured Kit
                    </span>
                  ) : null}
                </div>

                {/* Content */}
                <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                  <div className="space-y-1.5">
                    <h3 className="font-bold text-sm text-gray-900 line-clamp-1 group-hover:text-amber-600 transition-colors">
                      {project.title}
                    </h3>
                    <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed">
                      {project.short_description || project.description}
                    </p>
                  </div>

                  {/* Metadata Chips */}
                  <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-500">
                    <span className="flex items-center">
                      <Clock size={12} className="mr-1 text-amber-500" />
                      {project.estimated_time || '2-3 Hours'}
                    </span>
                    <span className="flex items-center">
                      <Layers size={12} className="mr-1 text-blue-500" />
                      {project.component_count || 5}+ Components
                    </span>
                  </div>

                  {/* Action Button */}
                  <Link
                    to={`/projects/${project.slug}`}
                    className="w-full mt-2 py-2 px-3 bg-gray-50 hover:bg-amber-500 text-gray-800 hover:text-gray-950 font-bold rounded text-xs border border-gray-200 hover:border-amber-500 flex items-center justify-center space-x-1.5 transition-all"
                  >
                    <span>View Project & Kit BOM</span>
                    <ArrowRight size={13} />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
