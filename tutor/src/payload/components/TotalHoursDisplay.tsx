"use client";
import React from "react";
import { useFormFields } from "@payloadcms/ui";

export const TotalHoursDisplay: React.FC = () => {
  const typeClass = useFormFields(([fields]) => fields.type_class?.value);
  const totalHours = useFormFields(([fields]) => fields.total_hours?.value) as number;
  const currentHours = useFormFields(([fields]) => {
    return Object.keys(fields)
      .filter((key) => key.startsWith("sessions.") && key.endsWith(".duration"))
      .reduce((sum, key) => sum + (Number(fields[key]?.value) || 0), 0);
  });

  const getStatusColor = () => {
    if (!totalHours || totalHours <= 0) return "#E72929"; // Primary
    if (currentHours >= totalHours) return "#23BD33"; // Success
    if (currentHours > 0) return "#FBA631"; // Warning
    return "#E72929"; // Primary
  };

  const statusColor = getStatusColor();

  if (typeClass !== "one_to_one") return null;

  return (
    <div style={{
      marginBottom: '16px',
      padding: '16px',
      borderRadius: '8px',
      backgroundColor: '#fff',
      border: '1px solid #e2e8f0',
      borderLeft: `6px solid ${statusColor}`,
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)'
    }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <span style={{ fontWeight: '600', color: '#64748b', fontSize: '14px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Tiến độ số giờ học
        </span>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
          <span style={{ 
            fontSize: '24px', 
            fontWeight: 'bold', 
            color: statusColor 
          }}>
            {currentHours.toFixed(1)}
          </span>
          <span style={{ color: '#94a3b8', fontSize: '16px' }}>/</span>
          <span style={{ color: '#1e293b', fontSize: '18px', fontWeight: '500' }}>
            {totalHours || 0} giờ
          </span>
        </div>
      </div>
      
      <div style={{
        height: '8px',
        width: '120px',
        backgroundColor: '#f1f5f9',
        borderRadius: '4px',
        overflow: 'hidden',
        position: 'relative'
      }}>
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          height: '100%',
          width: `${Math.min((currentHours / (totalHours || 1)) * 100, 100)}%`,
          backgroundColor: statusColor,
          transition: 'width 0.3s ease-in-out'
        }} />
      </div>
    </div>
  );
};

export default TotalHoursDisplay;
