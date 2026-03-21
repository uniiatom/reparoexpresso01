import React from 'react';
import HeroSection from '../components/home/HeroSection';
import FeaturedCategories from '../components/home/FeaturedCategories';
import HowItWorks from '../components/home/HowItWorks';
import CTASection from '../components/home/CTASection';

export default function Home() {
  return (
    <div>
      <HeroSection />
      <FeaturedCategories />
      <HowItWorks />
      <CTASection />
    </div>
  );
}