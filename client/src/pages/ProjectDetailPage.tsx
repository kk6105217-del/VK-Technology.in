import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../services/api';
import { Project, ProjectComponent } from '../types';
import { useCart } from '../context/CartContext';
import {
  Cpu, Clock, Layers, ArrowLeft, ExternalLink, Code, Video,
  CheckCircle2, ShoppingBag, Truck, ShieldCheck, Zap
} from 'lucide-react';

export const ProjectDetailPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [components, setComponents] = useState<ProjectComponent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (slug) {
      loadProject(slug);
    }
  }, [slug]);

  const loadProject = async (projectSlug: string) => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.projects.getBySlug(projectSlug);
      setProject(res.project);
      setComponents(res.components || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load DIY project details');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-[#eaeded] min-h-screen py-12 flex justify-center items-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-amber-500"></div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="bg-[#eaeded] min-h-screen py-12">
        <div className="max-w-xl mx-auto bg-white p-8 rounded-lg shadow-sm text-center space-y-4">
          <h2 className="text-lg font-bold text-gray-900">Project Not Found</h2>
          <p className="text-xs text-gray-500">{error || 'The requested DIY project could not be found.'}</p>
          <Link to="/projects" className="inline-flex items-center space-x-1 text-xs font-bold text-amber-600 hover:underline">
            <ArrowLeft size={14} />
            <span>Back to All Projects</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#eaeded] min-h-screen py-6 sm:py-8">
      <div className="max-w-[1200px] mx-auto px-4 space-y-6">
        
        {/* Breadcrumb */}
        <div className="text-xs text-gray-500 flex items-center space-x-1.5 flex-wrap">
          <Link to="/" className="hover:underline">Home</Link>
          <span>›</span>
          <Link to="/projects" className="hover:underline">DIY Projects</Link>
          <span>›</span>
          <span className="font-semibold text-gray-900 truncate max-w-xs">{project.title}</span>
        </div>

        {/* Hero Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 p-6 sm:p-8">
            <div className="lg:col-span-6 space-y-4">
              <div className="flex gap-2 items-center flex-wrap">
                <span className="bg-amber-100 text-amber-900 text-xs font-bold px-2.5 py-0.5 rounded">
                  {project.category}
                </span>
                <span className={`text-xs font-bold px-2.5 py-0.5 rounded ${
                  project.difficulty === 'Beginner' ? 'bg-emerald-100 text-emerald-800' :
                  project.difficulty === 'Intermediate' ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'
                }`}>
                  Difficulty: {project.difficulty}
                </span>
                <span className="bg-gray-100 text-gray-700 text-xs font-medium px-2.5 py-0.5 rounded flex items-center">
                  <Clock size={12} className="mr-1 text-amber-600" />
                  Time: {project.estimated_time}
                </span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900">
                {project.title}
              </h1>

              <p className="text-sm text-gray-600 leading-relaxed">
                {project.description}
              </p>

              {/* Resource Links */}
              <div className="pt-2 flex flex-wrap gap-3">
                {project.code_url && (
                  <a
                    href={project.code_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-gray-900 text-white rounded text-xs font-bold hover:bg-gray-800 transition"
                  >
                    <Code size={14} />
                    <span>View Arduino/ESP32 Code</span>
                    <ExternalLink size={12} />
                  </a>
                )}
                {project.youtube_url && (
                  <a
                    href={project.youtube_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-red-600 text-white rounded text-xs font-bold hover:bg-red-700 transition"
                  >
                    <Video size={14} />
                    <span>Watch Video Demo</span>
                    <ExternalLink size={12} />
                  </a>
                )}
              </div>
            </div>

            <div className="lg:col-span-6 flex flex-col justify-center">
              <div className="rounded-lg overflow-hidden border border-gray-200 shadow-sm bg-gray-50 max-h-96">
                <img
                  src={project.image_url}
                  alt={project.title}
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Bill of Materials (BOM) Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 sm:p-8 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-gray-100 gap-2">
            <div>
              <h2 className="text-lg font-bold text-gray-900 flex items-center space-x-2">
                <Layers className="text-amber-500" size={20} />
                <span>Required Hardware Components (Bill of Materials)</span>
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                All components are individually bench-tested and available directly from VK Technology.
              </p>
            </div>
            <Link
              to="/products"
              className="inline-flex items-center space-x-1 px-4 py-2 bg-amber-400 hover:bg-amber-500 text-gray-950 font-bold rounded text-xs transition shrink-0"
            >
              <ShoppingBag size={14} />
              <span>Browse All Kit Components</span>
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-gray-50 text-gray-600 font-bold border-b border-gray-200">
                  <th className="py-2.5 px-3">#</th>
                  <th className="py-2.5 px-3">Component Name</th>
                  <th className="py-2.5 px-3 text-center">Required Qty</th>
                  <th className="py-2.5 px-3">Specification / Notes</th>
                  <th className="py-2.5 px-3 text-right">Store Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-700">
                {components.map((comp, idx) => (
                  <tr key={comp.id || idx} className="hover:bg-gray-50/80">
                    <td className="py-2.5 px-3 font-semibold text-gray-400">{idx + 1}</td>
                    <td className="py-2.5 px-3 font-bold text-gray-900">{comp.name}</td>
                    <td className="py-2.5 px-3 text-center font-bold text-amber-700 bg-amber-50/50 rounded">
                      {comp.quantity}x
                    </td>
                    <td className="py-2.5 px-3 text-gray-500">{comp.notes || 'Standard project requirement'}</td>
                    <td className="py-2.5 px-3 text-right">
                      {comp.product_slug ? (
                        <Link
                          to={`/product/${comp.product_slug}`}
                          className="text-amber-600 font-bold hover:underline"
                        >
                          View In Store & Buy →
                        </Link>
                      ) : (
                        <span className="text-emerald-700 font-medium">Included in Full Kit</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Delivery & Assurance Notice */}
          <div className="mt-4 p-4 bg-emerald-50 border border-emerald-200 rounded-lg flex flex-col sm:flex-row items-center justify-between text-xs text-emerald-900 gap-2">
            <div className="flex items-center space-x-2">
              <Truck size={18} className="text-emerald-700 shrink-0" />
              <span>
                <strong>FREE delivery on orders over ₹999 • Estimated Delivery: 1-2 Weeks</strong> across India.
              </span>
            </div>
            <div className="flex items-center space-x-2 text-emerald-800">
              <ShieldCheck size={16} />
              <span>Direct Dispatches from Pedamiram, Andhra Pradesh</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
