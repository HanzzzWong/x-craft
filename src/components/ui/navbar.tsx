import Image from 'next/image';
import Link from 'next/link';
import { Button } from './button';

export function Navbar() {
  return (
    <nav className="w-full py-4 px-6 bg-gradient-to-r from-primary/10 to-accent/10 backdrop-blur-md border-b border-primary/20 shadow-md">
      <div className="container mx-auto flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="relative w-10 h-10 overflow-hidden rounded-full shadow-glow">
            <Image 
              src="/X.png" 
              alt="X Logo" 
              fill 
              className="object-cover transform hover:scale-110 transition-transform duration-300" 
              priority
            />
          </div>
          <span className="text-xl font-bold text-primary">X-Craft</span>
        </div>
        
        <div className="flex items-center gap-4">
          <Link href="/" className="hover:text-primary transition-colors">Home</Link>
          <Link href="#" className="hover:text-primary transition-colors">Projects</Link>
          <Link href="#" className="hover:text-primary transition-colors">About</Link>
          <Button variant="outline" className="hover:shadow-glow transition-all">Get Started</Button>
        </div>
      </div>
    </nav>
  );
} 