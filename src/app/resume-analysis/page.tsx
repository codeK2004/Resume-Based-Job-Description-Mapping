'use client';

import { useEffect, useState } from 'react';
import { storage } from '@/utils/storage';
import styles from './page.module.css';

interface ResumeAnalysis {
  name: string;
  email: string;
  phone: string;
  education: Array<{
    degree: string;
    institution: string;
    year: string;
  }>;
  experience: Array<{
    company: string;
    position: string;
    duration: string;
    description: string;
  }>;
  skills: string[];
}

export default function ResumeAnalysis() {
  const [analysis, setAnalysis] = useState<ResumeAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadAnalysis = () => {
      try {
        setLoading(true);
        setError('');
        
        const storedAnalysis = storage.getResumeAnalysis();
        if (!storedAnalysis) {
          throw new Error('No resume analysis found. Please upload your resume first.');
        }
        
        setAnalysis(storedAnalysis);
      } catch (err: any) {
        console.error('Error loading analysis:', err);
        setError(err.message || 'Failed to load resume analysis');
      } finally {
        setLoading(false);
      }
    };

    loadAnalysis();
  }, []);

  if (loading) {
    return (
      <main className={styles.main}>
        <div className={styles.container}>
          <div className={styles.loader}></div>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className={styles.main}>
        <div className={styles.container}>
          <div className={styles.errorContainer}>
            <p className={styles.errorMessage}>{error}</p>
          </div>
        </div>
      </main>
    );
  }

  if (!analysis) {
    return (
      <main className={styles.main}>
        <div className={styles.container}>
          <div className={styles.errorContainer}>
            <p className={styles.errorMessage}>No resume analysis available</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className={styles.main}>
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>Resume Analysis</h1>
        </div>

        <div className={styles.content}>
          <section className={styles.section}>
            <div className={styles.analysisDetails}>
              <div className={styles.detailItem}>
                <h3>Personal Information</h3>
                <p>Name: {analysis.name}</p>
                <p>Email: {analysis.email}</p>
                <p>Phone: {analysis.phone}</p>
              </div>

              <div className={styles.detailItem}>
                <h3>Education</h3>
                {analysis.education.map((edu, index) => (
                  <div key={index} className={styles.educationItem}>
                    <p>{edu.degree} at {edu.institution}</p>
                    <p>{edu.year}</p>
                  </div>
                ))}
              </div>

              <div className={styles.detailItem}>
                <h3>Experience</h3>
                {analysis.experience.map((exp, index) => (
                  <div key={index} className={styles.experienceItem}>
                    <h4>{exp.position} at {exp.company}</h4>
                    <p>{exp.duration}</p>
                    <p>{exp.description}</p>
                  </div>
                ))}
              </div>

              <div className={styles.detailItem}>
                <h3>Skills</h3>
                <div className={styles.skillsList}>
                  {analysis.skills.map((skill, index) => (
                    <span key={index} className={styles.skillTag}>
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
} 