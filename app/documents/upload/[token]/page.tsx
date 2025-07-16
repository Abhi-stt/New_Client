"use client";
import { useState, useRef } from "react";
import { use } from "react";

export default function DocumentUploadPage({ params }: { params: { token: string } }) {
  const { token } = use(params);
  const [status, setStatus] = useState<"idle"|"uploading"|"success"|"error">("idle");
  const [message, setMessage] = useState("");
  const [progress, setProgress] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      uploadFiles(e.dataTransfer.files);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragActive(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      uploadFiles(e.target.files);
    }
  };

  const uploadFiles = async (files: FileList) => {
    setStatus("uploading");
    setProgress(0);
    setMessage("");
    const formData = new FormData();
    Array.from(files).forEach((file) => {
      formData.append("files", file);
    });
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `http://localhost:5000/api/documents/upload/${token}`);
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        setProgress(Math.round((event.loaded / event.total) * 100));
      }
    };
    xhr.onload = () => {
      if (xhr.status === 200) {
        setStatus("success");
        setMessage("Document uploaded successfully!");
      } else {
        setStatus("error");
        setMessage(xhr.responseText || "Upload failed.");
      }
    };
    xhr.onerror = () => {
      setStatus("error");
      setMessage("Upload failed. Please try again.");
    };
    xhr.send(formData);
  };

  return (
    <div style={{ maxWidth: 420, margin: "60px auto", padding: 32, border: "1px solid #e5e7eb", borderRadius: 16, background: "#fff", boxShadow: "0 4px 24px rgba(0,0,0,0.08)" }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 16, textAlign: "center" }}>Upload Document</h1>
      {status === "success" ? (
        <div style={{ color: "#22c55e", textAlign: "center", fontWeight: 500, fontSize: 18 }}>{message}</div>
      ) : status === "error" ? (
        <div style={{ color: "#ef4444", textAlign: "center", fontWeight: 500, fontSize: 18 }}>{message}</div>
      ) : (
        <>
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            style={{
              border: dragActive ? "2px solid #3b82f6" : "2px dashed #cbd5e1",
              borderRadius: 12,
              padding: 32,
              textAlign: "center",
              background: dragActive ? "#f0f9ff" : "#f9fafb",
              marginBottom: 24,
              cursor: "pointer",
              transition: "border 0.2s, background 0.2s"
            }}
            onClick={() => fileInputRef.current?.click()}
          >
            <div style={{ fontSize: 48, color: "#3b82f6", marginBottom: 8 }}>📄</div>
            <div style={{ fontSize: 16, color: "#64748b", marginBottom: 8 }}>Drag & drop files here or <span style={{ color: "#3b82f6", textDecoration: "underline" }}>browse</span></div>
            <input
              ref={fileInputRef}
              type="file"
              name="files"
              multiple
              required
              style={{ display: "none" }}
              onChange={handleFileChange}
            />
          </div>
          {status === "uploading" && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ height: 8, background: "#e5e7eb", borderRadius: 4, overflow: "hidden" }}>
                <div style={{ width: `${progress}%`, height: 8, background: "#3b82f6", transition: "width 0.2s" }} />
              </div>
              <div style={{ textAlign: "center", marginTop: 8, color: "#3b82f6" }}>{progress}%</div>
            </div>
          )}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={status === "uploading"}
            style={{
              width: "100%",
              padding: "12px 0",
              background: "#3b82f6",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              fontWeight: 600,
              fontSize: 16,
              cursor: status === "uploading" ? "not-allowed" : "pointer",
              marginTop: 8
            }}
          >
            {status === "uploading" ? "Uploading..." : "Select Files"}
          </button>
        </>
      )}
    </div>
  );
} 