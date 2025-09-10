'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { storage } from '@/utils/storage';
import styles from "./page.module.css";

export default function Home() {
  const router = useRouter();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
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

  if (isLoading) {
    return (
      <main className={styles.main}>
        <div className={styles.container}>
          <div className={styles.loader}></div>
        </div>
      </main>
    );
  }

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const droppedFile = e.dataTransfer.files?.[0];
    handleFileSelection(droppedFile);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    handleFileSelection(selectedFile);
  };

  const handleFileSelection = (file: File | undefined) => {
    if (file) {
      if (file.type === 'application/pdf' || file.type === 'application/msword' || file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        setFile(file);
        setError('');
      } else {
        setError('Please upload a PDF or Word document');
        setFile(null);
      }
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError('Please select a file to upload');
      return;
    }

    setUploading(true);
    setError('');

    try {
      console.log('Starting file upload...');
      // First, upload the file
      const formData = new FormData();
      formData.append('resume', file);

      console.log('Sending file to upload endpoint...');
      const uploadResponse = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!uploadResponse.ok) {
        const errorData = await uploadResponse.json();
        console.error('Upload failed:', errorData);
        throw new Error(`Upload failed: ${errorData.error || uploadResponse.statusText}`);
      }

      console.log('File uploaded successfully, fetching resume data...');
      // Get the uploaded file text
      const resumeResponse = await fetch('/api/resume');
      if (!resumeResponse.ok) {
        const errorData = await resumeResponse.json();
        console.error('Failed to get resume data:', errorData);
        throw new Error(`Failed to get resume data: ${errorData.error || resumeResponse.statusText}`);
      }
      const resumeData = await resumeResponse.json();

      if (!resumeData.text) {
        console.error('No text content in resume data:', resumeData);
        throw new Error('No text content found in the resume');
      }

      console.log('Resume data received, sending for analysis...');
      // Send for analysis
      const analysisResponse = await fetch('/api/resume/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ resumeText: resumeData.text }),
      });

      if (!analysisResponse.ok) {
        const errorData = await analysisResponse.json();
        console.error('Analysis failed:', errorData);
        throw new Error(`Analysis failed: ${errorData.error || analysisResponse.statusText}`);
      }

      const analysisData = await analysisResponse.json();
      console.log('Analysis completed successfully');

      // Store the resume analysis
      if (analysisData.resumeAnalysis) {
        storage.setResumeAnalysis(analysisData.resumeAnalysis);
      }

      // Store the job recommendations
      if (analysisData.jobRecommendations && Array.isArray(analysisData.jobRecommendations)) {
        storage.setJobRecommendations(analysisData.jobRecommendations);
      }

      // Navigate to the resume analysis page
      router.push('/resume-analysis');
    } catch (err: any) {
      console.error('Error during upload:', err);
      setError(err.message || 'An error occurred during upload');
    } finally {
      setUploading(false);
    }
  };

  return (
    <main className={styles.main}>
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>JobMatch</h1>
          <p className={styles.subtitle}>Find Your Perfect Career Match</p>
        </div>
        
        <div className={styles.content}>
          <div className={styles.features}>
            <div className={styles.feature}>
              <div className={styles.featureIcon}>📄</div>
              <h3>Upload Resume</h3>
              <p>Share your experience</p>
            </div>
            <div className={styles.feature}>
              <div className={styles.featureIcon}>🎯</div>
              <h3>Match Skills</h3>
              <p>AI-powered matching</p>
            </div>
            <div className={styles.feature}>
              <div className={styles.featureIcon}>💼</div>
              <h3>Find Jobs</h3>
              <p>Get personalized recommendations</p>
            </div>
          </div>

          <div className={styles.uploadSection}>
            <div
              className={`${styles.dropzone} ${dragActive ? styles.dragActive : ''} ${error ? styles.error : ''}`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => inputRef.current?.click()}
            >
              <input
                ref={inputRef}
                type="file"
                className={styles.fileInput}
                accept=".pdf,.doc,.docx"
                onChange={handleFileChange}
              />
              <div className={styles.dropzoneContent}>
                <div className={styles.uploadIcon}>📄</div>
                <p>Drag and drop your resume here, or click to browse</p>
                <button className={styles.browseButton}>Browse Files</button>
              </div>
            </div>

            {file && (
              <p className={styles.fileName}>
                Selected file: {file.name}
              </p>
            )}

            {error && (
              <div className={styles.errorContainer}>
                <p className={styles.errorMessage}>{error}</p>
                <button 
                  className={styles.retryButton}
                  onClick={() => {
                    setError('');
                    setFile(null);
                  }}
                >
                  Try Again
                </button>
              </div>
            )}

            <div className={styles.actionButtons}>
              <button
                className={styles.uploadButton}
                onClick={handleUpload}
                disabled={!file || uploading}
              >
                {uploading ? (
                  <span className={styles.uploadingText}>
                    <span className={styles.spinner}></span>
                    Uploading...
                  </span>
                ) : (
                  'Upload Resume'
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
