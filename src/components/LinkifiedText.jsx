import React, { useState } from 'react';
import { linkifyText } from '../utils/linkify';

const LinkifiedText = ({ text, className = '' }) => {
  const [imageErrors, setImageErrors] = useState({});
  
  const segments = linkifyText(text);
  
  const handleImageError = (url) => {
    setImageErrors(prev => ({ ...prev, [url]: true }));
  };
  
  return (
    <span className={className}>
      {segments.map((segment, index) => {
        if (segment.type === 'text') {
          return <span key={index}>{segment.content}</span>;
        } else if (segment.type === 'link') {
          return (
            <a
              key={index}
              href={segment.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 dark:text-blue-400 hover:underline mx-1"
              title={segment.url}
            >
              {segment.content}
            </a>
          );
        } else if (segment.type === 'image' && !imageErrors[segment.url]) {
          return (
            <span key={index} className="inline-block my-2">
              <a
                href={segment.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block"
              >
                <img
                  src={segment.url}
                  alt="Image"
                  className="max-w-full rounded-lg shadow-md hover:shadow-lg transition-shadow cursor-pointer"
                  style={{ maxHeight: '300px', objectFit: 'contain' }}
                  onError={() => handleImageError(segment.url)}
                />
              </a>
            </span>
          );
        } else if (segment.type === 'image' && imageErrors[segment.url]) {
          // If image failed to load, show as regular link
          return (
            <a
              key={index}
              href={segment.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 dark:text-blue-400 hover:underline mx-1"
              title="Image link (failed to load)"
            >
              {segment.url}
            </a>
          );
        }
        return null;
      })}
    </span>
  );
};

export default LinkifiedText;