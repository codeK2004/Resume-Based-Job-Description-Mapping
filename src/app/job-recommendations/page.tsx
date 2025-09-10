'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './page.module.css';
import { storage } from '@/utils/storage';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement } from 'chart.js';
import { Pie, Bar } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement);

interface JobRecommendation {
  jobTitle: string;
  reasoning: string;
  requiredSkills: string[];
  missingSkills: string[];
  thresholdScore: {
    overallScore: number;
    selectionPercentage: number;
    rejectionPercentage: number;
    barGraphMetrics: {
      skillMatch: number;
      experienceMatch: number;
      educationMatch: number;
      overallMatch: number;
    };
    detailedAnalysis: string;
  };
}

type TabType = 'description' | 'threshold' | 'skills';

export default function JobRecommendations() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [recommendations, setRecommendations] = useState<JobRecommendation[]>([]);
  const [selectedJob, setSelectedJob] = useState<JobRecommendation | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('description');
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    const loadRecommendations = () => {
      try {
        const data = storage.getJobRecommendations();
        if (!data || data.length === 0) {
          setError('No job recommendations found. Please upload your resume first.');
        } else {
          setRecommendations(data);
        }
      } catch (err) {
        console.error('Error loading recommendations:', err);
        setError('Failed to load job recommendations. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    loadRecommendations();
  }, []);

  const handleJobClick = (index: number) => {
    router.push(`/job-recommendations/${index}`);
  };

  if (loading) {
    return (
      <div className={styles.main}>
        <div className={styles.container}>
          <div className={styles.loader} />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.main}>
        <div className={styles.container}>
          <div className={styles.errorContainer}>
            <p className={styles.errorMessage}>{error}</p>
            <button 
              onClick={() => router.push('/')}
              className={styles.applyButton}
            >
              Upload Resume
            </button>
          </div>
        </div>
      </div>
    );
  }

  const renderTabContent = () => {
    if (!selectedJob) return null;

    switch (activeTab) {
      case 'description':
        return (
          <div className={styles.tabContent}>
            <h3>Job Description</h3>
            <p>{selectedJob.reasoning}</p>
          </div>
        );
      case 'threshold':
        const thresholdData = {
          labels: ['Selection', 'Rejection'],
          datasets: [{
            data: [
              selectedJob.thresholdScore.selectionPercentage,
              selectedJob.thresholdScore.rejectionPercentage
            ],
            backgroundColor: [
              '#4f46e5', // Indigo
              '#fee2e2'  // Red
            ],
            borderWidth: 0,
          }],
        };

        const breakdownData = {
          labels: ['Skills Match', 'Experience', 'Education', 'Overall'],
          datasets: [{
            label: 'Match Percentage',
            data: [
              selectedJob.thresholdScore.barGraphMetrics.skillMatch,
              selectedJob.thresholdScore.barGraphMetrics.experienceMatch,
              selectedJob.thresholdScore.barGraphMetrics.educationMatch,
              selectedJob.thresholdScore.barGraphMetrics.overallMatch
            ],
            backgroundColor: '#4f46e5',
            borderRadius: 4,
          }],
        };

        const chartOptions = {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'bottom' as const,
            },
          },
          scales: {
            y: {
              beginAtZero: true,
              max: 100,
              title: {
                display: true,
                text: 'Percentage (%)'
              }
            }
          }
        };

        return (
          <div className={styles.tabContent}>
            <h3>Threshold Analysis</h3>
            <div className={styles.thresholdVisualization}>
              <div className={styles.pieChart}>
                <Pie data={thresholdData} options={chartOptions} />
              </div>
              <div className={styles.barChart}>
                <Bar data={breakdownData} options={chartOptions} />
              </div>
            </div>
          </div>
        );
      case 'skills':
        return (
          <div className={styles.tabContent}>
            <h3>Required Skills</h3>
            <div className={styles.skillsList}>
              {selectedJob.requiredSkills.map((skill, i) => (
                <span key={i} className={styles.skillTag}>
                  {skill}
                </span>
              ))}
            </div>
            {selectedJob.missingSkills.length > 0 && (
              <>
                <h3>Skills to Develop</h3>
                <div className={styles.skillsList}>
                  {selectedJob.missingSkills.map((skill, i) => (
                    <span key={i} className={`${styles.skillTag} ${styles.missing}`}>
                      {skill}
                    </span>
                  ))}
                </div>
              </>
            )}
          </div>
        );
    }
  };

  return (
    <div className={styles.main}>
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>Job Recommendations</h1>
        </div>

        <div className={styles.content}>
          <div className={styles.jobSelector}>
            {recommendations.map((job, index) => (
              <div 
                key={index} 
                className={styles.jobCard}
                onClick={() => handleJobClick(index)}
              >
                <div className={styles.jobHeader}>
                  <h3>{job.jobTitle}</h3>
                  <div className={styles.matchScore}>
                    {Math.round(job.thresholdScore.selectionPercentage)}% Selection
                  </div>
                </div>
              </div>
            ))}
          </div>

          {showDetails && selectedJob && (
            <div className={`${styles.jobDetails} ${styles.slideIn}`}>
              <div className={styles.tabNavigation}>
                <button
                  className={`${styles.tabButton} ${activeTab === 'description' ? styles.active : ''}`}
                  onClick={() => setActiveTab('description')}
                >
                  Job Description
                </button>
                <button
                  className={`${styles.tabButton} ${activeTab === 'threshold' ? styles.active : ''}`}
                  onClick={() => setActiveTab('threshold')}
                >
                  Threshold Score
                </button>
                <button
                  className={`${styles.tabButton} ${activeTab === 'skills' ? styles.active : ''}`}
                  onClick={() => setActiveTab('skills')}
                >
                  Required Skills
                </button>
              </div>

              {renderTabContent()}

              <button className={styles.applyButton}>
                Apply for this Position
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 