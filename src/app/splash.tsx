'use client';

import Image from 'next/image';
import { motion } from 'framer-motion';

// Define fixed positions for the circles to avoid hydration mismatch
const circleConfigs = [
  { width: 150, height: 180, top: 20, left: 15 },
  { width: 200, height: 120, top: 60, left: 70 },
  { width: 100, height: 220, top: 30, left: 80 },
  { width: 180, height: 200, top: 75, left: 30 },
  { width: 250, height: 150, top: 40, left: 50 },
  { width: 120, height: 170, top: 10, left: 90 }
];

export default function SplashScreen() {
  return (
    <div className="fixed inset-0 bg-gradient-to-br from-green-50 via-green-100 to-white flex flex-col items-center justify-center overflow-hidden">
      {/* Background animated circles */}
      <div className="absolute inset-0 overflow-hidden">
        {circleConfigs.map((config, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full bg-green-100 opacity-30"
            style={{
              width: `${config.width}px`,
              height: `${config.height}px`,
              top: `${config.top}%`,
              left: `${config.left}%`,
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

      {/* Main content */}
      <motion.div
        initial={{ scale: 0, opacity: 0, rotateY: 90 }}
        animate={{ scale: 1, opacity: 1, rotateY: 0 }}
        transition={{ 
          duration: 0.6, 
          type: 'spring', 
          stiffness: 100,
          damping: 10
        }}
        className="flex flex-col items-center relative z-10"
      >
        <motion.div
          className="relative w-40 h-40 mb-8 overflow-hidden rounded-full border-4 border-green-300 shadow-lg"
          whileHover={{ scale: 1.05, rotate: 5 }}
          whileTap={{ scale: 0.95 }}
          initial={{ y: -20 }}
          animate={{ 
            y: [0, -10, 0],
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
          className="text-5xl font-bold text-green-800 mb-2"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          style={{
            textShadow: "0px 2px 4px rgba(0, 128, 0, 0.2)"
          }}
        >
          X-Craft
        </motion.h1>
        
        <motion.div
          className="mt-12 text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8, duration: 0.5 }}
        >
          <motion.p 
            className="text-green-700 text-sm"
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          >
            Powered by Team X
          </motion.p>
        </motion.div>
      </motion.div>

      {/* Loading indicator */}
      <motion.div 
        className="absolute bottom-10 flex space-x-2 justify-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        {[...Array(3)].map((_, i) => (
          <motion.div
            key={i}
            className="w-3 h-3 rounded-full bg-green-500"
            animate={{ scale: [1, 1.5, 1] }}
            transition={{
              duration: 0.6,
              repeat: Infinity,
              repeatType: "reverse",
              delay: i * 0.2
            }}
          />
        ))}
      </motion.div>
    </div>
  );
} 