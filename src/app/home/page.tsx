'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Icons } from '@/components/icons';
import { useAuth } from '@/contexts/auth-context';

export default function HomePage() {
  const router = useRouter();
  const { user } = useAuth();

  // Redirect to login page if user is not authenticated
  useEffect(() => {
    if (!user) {
      router.push('/auth/login');
    }
  }, [user, router]);

  if (!user) {
    return null; // Don't render anything while checking auth
  }

  // Card animation variants
  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: {
        delay: i * 0.1,
        duration: 0.5,
        type: 'spring',
        stiffness: 100,
        damping: 10
      }
    })
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-green-100 to-white overflow-hidden relative">
      {/* Animated background circles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full bg-green-300 opacity-20"
            style={{
              width: `${100 + i * 30}px`,
              height: `${150 + i * 20}px`,
              top: `${10 + i * 12}%`,
              left: `${15 + i * 15}%`,
            }}
            animate={{
              scale: [1, 1.2, 1],
              x: [0, 10, 0],
              y: [0, 15, 0],
            }}
            transition={{
              duration: 3 + (i % 3),
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
        ))}
      </div>

      {/* Hero Section */}
      <section className="relative z-10 pt-12 pb-20">
        <div className="container mx-auto px-4">
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className="flex flex-col items-center mb-16"
          >
            {/* Logo */}
            <motion.div
              className="relative w-28 h-28 mb-6 overflow-hidden rounded-full border-4 border-green-300 shadow-lg"
              whileHover={{ scale: 1.05, rotate: 5 }}
              animate={{ 
                y: [0, -8, 0],
                boxShadow: [
                  "0px 0px 10px rgba(0,128,0,0.3)", 
                  "0px 0px 30px rgba(0,128,0,0.6)", 
                  "0px 0px 10px rgba(0,128,0,0.3)"
                ]
              }}
              transition={{ 
                y: { duration: 2, repeat: Infinity, ease: "easeInOut" },
                boxShadow: { duration: 2, repeat: Infinity }
              }}
            >
              <div className="absolute inset-0 bg-gradient-to-tr from-green-300/20 to-transparent z-10" />
              <Image 
                src="/X.png" 
                alt="X Logo" 
                fill 
                className="object-cover" 
                priority
              />
            </motion.div>

            <motion.h1 
              className="text-5xl font-bold text-green-800 mb-4 text-center"
              style={{ textShadow: "0px 2px 4px rgba(0, 128, 0, 0.2)" }}
            >
              X-Craft 
            </motion.h1>
            
            <motion.p 
              className="text-xl text-green-600 max-w-2xl text-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              Transform recyclables into amazing DIY creations with the power of AI
            </motion.p>

            <motion.p
              className="text-2xl font-medium text-green-700 mt-2 max-w-2xl text-center italic"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              style={{ textShadow: "0px 1px 2px rgba(0, 128, 0, 0.15)" }}
            >
              "Trash into gold, In one moment"
            </motion.p>
          </motion.div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            <motion.div 
              custom={0} 
              variants={cardVariants} 
              initial="hidden" 
              animate="visible"
              whileHover={{ scale: 1.03, rotate: 1 }}
              className="perspective-1000"
            >
              <Card className="bg-white/80 backdrop-blur-sm border border-green-200 shadow-xl hover:shadow-green-200/30 transition-all duration-300 h-full transform-gpu">
                <CardHeader className="bg-gradient-to-r from-green-100/80 to-transparent pb-6">
                  <CardTitle className="text-2xl text-green-800 flex items-center">
                    <Icons.plus className="h-6 w-6 mr-2 text-green-600" />
                    Create Project
                  </CardTitle>
                  <CardDescription className="text-green-600">Start a new DIY eco-project</CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="flex justify-center mb-6">
                    <motion.div 
                      className="w-20 h-20 bg-gradient-to-br from-green-500 to-green-300 rounded-full flex items-center justify-center shadow-lg"
                      whileHover={{ scale: 1.1, rotate: 5 }}
                      animate={{ boxShadow: ['0px 0px 5px rgba(0,128,0,0.3)', '0px 0px 20px rgba(0,128,0,0.5)', '0px 0px 5px rgba(0,128,0,0.3)'] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    >
                      <Icons.plus className="h-10 w-10 text-white" />
                    </motion.div>
                  </div>
                  <p className="text-center text-gray-700">
                    Transform recyclable items into beautiful and functional objects. 
                    Take a photo and get AI-powered project suggestions.
                  </p>
                  <div className="mt-6 text-center">
                    <Button 
                      className="bg-green-600 hover:bg-green-700 text-white shadow-md hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1"
                      onClick={() => router.push('/main')}
                    >
                      Start Creating
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div 
              custom={1} 
              variants={cardVariants} 
              initial="hidden" 
              animate="visible"
              whileHover={{ scale: 1.03, rotate: -1 }}
              className="perspective-1000"
            >
              <Card className="bg-white/80 backdrop-blur-sm border border-green-200 shadow-xl hover:shadow-green-200/30 transition-all duration-300 h-full transform-gpu">
                <CardHeader className="bg-gradient-to-r from-green-100/80 to-transparent pb-6">
                  <CardTitle className="text-2xl text-green-800 flex items-center">
                    <Icons.folder className="h-6 w-6 mr-2 text-green-600" />
                    View Projects
                  </CardTitle>
                  <CardDescription className="text-green-600">See your saved projects</CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="flex justify-center mb-6">
                    <motion.div 
                      className="w-20 h-20 bg-gradient-to-br from-green-500 to-green-300 rounded-full flex items-center justify-center shadow-lg"
                      whileHover={{ scale: 1.1, rotate: 5 }}
                      animate={{ boxShadow: ['0px 0px 5px rgba(0,128,0,0.3)', '0px 0px 20px rgba(0,128,0,0.5)', '0px 0px 5px rgba(0,128,0,0.3)'] }}
                      transition={{ duration: 2, repeat: Infinity, delay: 0.3 }}
                    >
                      <Icons.folder className="h-10 w-10 text-white" />
                    </motion.div>
                  </div>
                  <p className="text-center text-gray-700">
                    Browse your collection of saved DIY projects. 
                    Resume in-progress projects or revisit your completed creations.
                  </p>
                  <div className="mt-6 text-center">
                    <Button 
                      className="bg-green-600 hover:bg-green-700 text-white shadow-md hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1"
                      onClick={() => router.push('/projects')}
                    >
                      View Projects
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div 
              custom={2} 
              variants={cardVariants} 
              initial="hidden" 
              animate="visible"
              whileHover={{ scale: 1.03, rotate: 1 }}
              className="perspective-1000"
            >
              <Card className="bg-white/80 backdrop-blur-sm border border-green-200 shadow-xl hover:shadow-green-200/30 transition-all duration-300 h-full transform-gpu">
                <CardHeader className="bg-gradient-to-r from-green-100/80 to-transparent pb-6">
                  <CardTitle className="text-2xl text-green-800 flex items-center">
                    <Icons.users className="h-6 w-6 mr-2 text-green-600" />
                    Community Hub
                  </CardTitle>
                  <CardDescription className="text-green-600">Discover community projects</CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="flex justify-center mb-6">
                    <motion.div 
                      className="w-20 h-20 bg-gradient-to-br from-green-500 to-green-300 rounded-full flex items-center justify-center shadow-lg"
                      whileHover={{ scale: 1.1, rotate: 5 }}
                      animate={{ boxShadow: ['0px 0px 5px rgba(0,128,0,0.3)', '0px 0px 20px rgba(0,128,0,0.5)', '0px 0px 5px rgba(0,128,0,0.3)'] }}
                      transition={{ duration: 2, repeat: Infinity, delay: 0.6 }}
                    >
                      <Icons.users className="h-10 w-10 text-white" />
                    </motion.div>
                  </div>
                  <p className="text-center text-gray-700">
                    Connect with other eco-conscious creators. Share your projects, 
                    get inspired, and join the sustainable DIY community.
                  </p>
                  <div className="mt-6 text-center">
                    <Button 
                      className="bg-green-600 hover:bg-green-700 text-white shadow-md hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1"
                      onClick={() => router.push('/community')}
                    >
                      Join Community
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Impact Dashboard */}
      <section className="relative z-10 py-8 bg-white/30 backdrop-blur-sm border-t border-green-100">
        <div className="container mx-auto px-4">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.5 }}
            className="max-w-6xl mx-auto"
          >
            <h2 className="text-3xl font-bold text-green-800 mb-8 text-center">
              Eco Impact Dashboard
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <motion.div 
                whileHover={{ scale: 1.05 }}
                className="bg-white/80 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-green-100"
              >
                <h3 className="font-medium text-green-800 mb-2">Projects Completed</h3>
                <p className="text-5xl font-bold bg-gradient-to-r from-green-600 to-green-400 bg-clip-text text-transparent">0</p>
              </motion.div>
              
              <motion.div 
                whileHover={{ scale: 1.05 }}
                className="bg-white/80 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-green-100"
              >
                <h3 className="font-medium text-green-800 mb-2">Items Recycled</h3>
                <p className="text-5xl font-bold bg-gradient-to-r from-green-600 to-green-400 bg-clip-text text-transparent">0</p>
              </motion.div>
              
              <motion.div 
                whileHover={{ scale: 1.05 }}
                className="bg-white/80 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-green-100"
              >
                <h3 className="font-medium text-green-800 mb-2">CO₂ Saved (est.)</h3>
                <p className="text-5xl font-bold bg-gradient-to-r from-green-600 to-green-400 bg-clip-text text-transparent">0 kg</p>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
} 