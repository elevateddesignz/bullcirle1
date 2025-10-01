import React from 'react';
import { BookOpen, Play, FileText, Award, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Learn() {
  const courses = [
    {
      title: 'Trading Basics',
      description: 'Learn the fundamentals of stock trading',
      icon: BookOpen,
      lessons: 12,
      duration: '2 hours',
      path: '/learn/trading-basics'
    },
    {
      title: 'Technical Analysis',
      description: 'Master chart patterns and indicators',
      icon: FileText,
      lessons: 8,
      duration: '1.5 hours',
      path: '/learn/technical-analysis'
    },
    {
      title: 'Options Trading',
      description: 'Understanding options strategies',
      icon: Play,
      lessons: 15,
      duration: '3 hours',
      path: '/learn/options-trading'
    },
    {
      title: 'Risk Management',
      description: 'Learn to protect your investments',
      icon: Award,
      lessons: 6,
      duration: '1 hour',
      path: '/learn/risk-management'
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">BullCircle University</h1>
        <Link
          to="/learn/bullscript"
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-primary/20 text-brand-primary hover:bg-brand-primary/30 transition-colors"
        >
          <span>BullScript</span>
          <ArrowRight size={18} />
        </Link>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {courses.map((course, index) => {
          const Icon = course.icon;
          return (
            <Link
              key={index}
              to={course.path}
              className="bg-white dark:bg-gray-800/30 rounded-xl p-6 border border-gray-200 dark:border-brand-primary/20 hover:border-brand-primary/40 transition-all duration-200 cursor-pointer group"
            >
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-lg bg-brand-primary/10 text-brand-primary group-hover:scale-110 transition-transform">
                  <Icon size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">{course.title}</h3>
                  <p className="text-gray-400 mb-4">{course.description}</p>
                  <div className="flex items-center gap-4 text-sm text-gray-400">
                    <span>{course.lessons} lessons</span>
                    <span>{course.duration}</span>
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Featured Video */}
      <div className="bg-white dark:bg-gray-800/30 rounded-xl p-6 border border-gray-200 dark:border-brand-primary/20">
        <h2 className="text-xl font-semibold mb-4">Featured Lesson</h2>
        <div className="aspect-video bg-gray-900 rounded-lg flex items-center justify-center mb-4">
          <Play size={48} className="text-brand-primary opacity-50" />
        </div>
        <h3 className="text-lg font-medium">Introduction to Technical Analysis</h3>
        <p className="text-gray-400 mt-2">
          Learn how to read charts and identify key patterns that can help predict market movements.
        </p>
      </div>
    </div>
  );
}
