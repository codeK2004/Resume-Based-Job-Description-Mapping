'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import styles from './page.module.css';

interface SkillTip {
  category: string;
  title: string;
  description: string;
  resources: string[];
}

export default function SkillEnhancement() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if user is logged in
    const isLoggedIn = sessionStorage.getItem('isLoggedIn');
    if (!isLoggedIn) {
      router.push('/signin');
    } else {
      setIsLoading(false);
    }
  }, [router]);

  const skillTips: SkillTip[] = [
    {
      category: "Technical Skills",
      title: "Programming & Development",
      description: "Enhance your coding abilities with these resources",
      resources: [
        "FreeCodeCamp - Free interactive coding lessons",
        "LeetCode - Practice coding problems",
        "GitHub - Contribute to open source projects",
        "Udemy - Comprehensive programming courses"
      ]
    },
    {
      category: "Soft Skills",
      title: "Communication & Leadership",
      description: "Develop essential workplace skills",
      resources: [
        "Toastmasters - Public speaking practice",
        "LinkedIn Learning - Professional development courses",
        "Coursera - Leadership and management courses",
        "TED Talks - Learn from industry leaders"
      ]
    },
    {
      category: "Industry Knowledge",
      title: "Stay Updated",
      description: "Keep up with industry trends and developments",
      resources: [
        "Industry newsletters and blogs",
        "Professional networking events",
        "Webinars and online conferences",
        "Industry-specific certifications"
      ]
    },
    {
      category: "Project Management",
      title: "Agile & Scrum",
      description: "Master project management methodologies",
      resources: [
        "Scrum.org - Scrum framework training",
        "PMI - Project Management Institute resources",
        "Agile Alliance - Agile methodology guides",
        "Jira - Practice with project management tools"
      ]
    }
  ];

  if (isLoading) {
    return (
      <main className={styles.main}>
        <div className={styles.container}>
          <div className={styles.loader}></div>
        </div>
      </main>
    );
  }

  return (
    <main className={styles.main}>
      <div className={styles.container}>
        <h1 className={styles.title}>Skill Enhancement</h1>
        <p className={styles.subtitle}>Resources and tips to boost your career</p>

        <div className={styles.tipsGrid}>
          {skillTips.map((tip, index) => (
            <div key={index} className={styles.tipCard}>
              <div className={styles.tipHeader}>
                <span className={styles.category}>{tip.category}</span>
                <h2 className={styles.tipTitle}>{tip.title}</h2>
              </div>
              <p className={styles.description}>{tip.description}</p>
              <div className={styles.resources}>
                <h3>Recommended Resources:</h3>
                <ul>
                  {tip.resources.map((resource, idx) => (
                    <li key={idx}>{resource}</li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
} 