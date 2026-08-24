"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Menu, X } from "lucide-react";
import { usePathname } from "next/navigation";

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const [activeHash, setActiveHash] = useState("/");

  useEffect(() => {
    const handleScroll = () => {
      if (window.location.pathname !== "/") {
        setActiveHash("");
        return;
      }

      // Check from bottom to top
      const sections = [
        { id: "hoc-phi", hash: "/#hoc-phi" },
        { id: "chuong-trinh", hash: "/#chuong-trinh" },
      ];

      let current = "/";
      for (const section of sections) {
        const el = document.getElementById(section.id);
        if (el) {
          const rect = el.getBoundingClientRect();
          if (rect.top <= 250) {
            current = section.hash;
            break; // Stop at the lowest visible section
          }
        }
      }

      if (window.scrollY < 100) {
        current = "/";
      }

      setActiveHash(current);
    };

    window.addEventListener("scroll", handleScroll);
    handleScroll(); // init
    return () => window.removeEventListener("scroll", handleScroll);
  }, [pathname]);

  const navLinks = [
    { name: "Trang chủ", href: "/" },
    { name: "Chương trình", href: "/#chuong-trinh" },
    { name: "Học phí", href: "/#hoc-phi" },
    { name: "Lịch khai giảng", href: "/courses" },
  ];

  const checkIsActive = (href: string) => {
    if (href === "/courses") return pathname === "/courses" || pathname.startsWith("/register");
    if (href.startsWith("/#")) return pathname === "/" && activeHash === href;
    if (href === "/") return pathname === "/" && activeHash === "/";
    return false;
  };

  return (
    <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-100 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        
        {/* Logo */}
        <div className="flex items-center">
          <Link href="/" className="flex items-center space-x-3 group" onClick={() => window.scrollTo(0, 0)}>
            <Image 
              src="/Logo/logo TTCC115 goc trong suot 500x500.png" 
              alt="Logo TTCC 115" 
              width={45} 
              height={45} 
              className="object-contain transition-transform group-hover:scale-105"
            />
            <div className="flex flex-col">
              <span className="text-[10px] md:text-[11px] font-bold text-gray-500 uppercase tracking-wider">Sở Y tế TP.HCM</span>
              <span className="text-sm md:text-xl font-extrabold text-[var(--color-brand-900)] leading-tight">Trung tâm Cấp cứu 115</span>
            </div>
          </Link>
        </div>

        {/* Desktop Nav */}
        <nav className="hidden md:flex space-x-8 font-bold">
          {navLinks.map((link) => {
            const active = checkIsActive(link.href);
            return (
              <Link 
                key={link.href} 
                href={link.href} 
                className={`transition-colors ${active ? 'text-[var(--color-brand-600)]' : 'text-gray-600 hover:text-[var(--color-brand-600)]'}`}
              >
                {link.name}
              </Link>
            );
          })}
        </nav>

        {/* Desktop CTA */}
        <div className="hidden md:flex items-center space-x-4">
          <Link
            href="/admin/login"
            className="px-4 py-2 text-sm font-bold text-gray-500 bg-gray-100 rounded-lg hover:bg-gray-200 hover:text-gray-800 transition-colors"
          >
            Đăng nhập
          </Link>
        </div>

        {/* Mobile Hamburger Toggle */}
        <div className="md:hidden flex items-center">
          <button 
            onClick={() => setIsOpen(!isOpen)}
            className="p-2 text-gray-600 hover:text-[var(--color-brand-600)] focus:outline-none bg-gray-50 rounded-lg"
          >
            {isOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {isOpen && (
        <div className="md:hidden absolute top-20 left-0 w-full bg-white border-b border-gray-100 shadow-xl py-4 px-4 flex flex-col space-y-4 font-bold text-lg animate-in slide-in-from-top-4 duration-200">
          {navLinks.map((link) => {
            const active = checkIsActive(link.href);
            return (
              <Link 
                key={link.href} 
                href={link.href} 
                onClick={() => setIsOpen(false)}
                className={`p-3 rounded-xl transition-colors ${active ? 'bg-[var(--color-brand-50)] text-[var(--color-brand-600)]' : 'text-gray-700 hover:bg-gray-50'}`}
              >
                {link.name}
              </Link>
            );
          })}
          <div className="h-px bg-gray-100 w-full my-2"></div>
          <Link
            href="/admin/login"
            onClick={() => setIsOpen(false)}
            className="p-3 text-center text-gray-600 bg-gray-100 rounded-xl"
          >
            Đăng nhập
          </Link>
        </div>
      )}
    </header>
  );
}
