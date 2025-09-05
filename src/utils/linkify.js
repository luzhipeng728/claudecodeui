// Utility function to detect and parse URLs in text
export const linkifyText = (text) => {
  // Comprehensive URL regex pattern
  const urlRegex = /(https?:\/\/[^\s<>"{}|\\^\[\]`]+)/gi;
  
  // Image extensions to detect
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp', '.ico', '.avif'];
  
  // Check if a URL is an image
  const isImageUrl = (url) => {
    const lowercaseUrl = url.toLowerCase();
    return imageExtensions.some(ext => lowercaseUrl.includes(ext)) || 
           lowercaseUrl.match(/\.(jpg|jpeg|png|gif|webp|svg|bmp|ico|avif)(\?|#|$)/i) ||
           lowercaseUrl.includes('images.unsplash.com') ||
           lowercaseUrl.includes('imgur.com') ||
           lowercaseUrl.includes('i.imgur.com') ||
           lowercaseUrl.includes('cloudinary.com') ||
           lowercaseUrl.includes('cdn.discordapp.com/attachments');
  };
  
  // Split text by URLs and create segments
  const segments = [];
  let lastIndex = 0;
  let match;
  
  while ((match = urlRegex.exec(text)) !== null) {
    // Add text before URL
    if (match.index > lastIndex) {
      segments.push({
        type: 'text',
        content: text.substring(lastIndex, match.index)
      });
    }
    
    // Add URL segment
    const url = match[0];
    segments.push({
      type: isImageUrl(url) ? 'image' : 'link',
      content: url,
      url: url
    });
    
    lastIndex = match.index + match[0].length;
  }
  
  // Add remaining text
  if (lastIndex < text.length) {
    segments.push({
      type: 'text',
      content: text.substring(lastIndex)
    });
  }
  
  return segments;
};

// Component to render linkified text with React elements
export const renderLinkifiedText = (text) => {
  const segments = linkifyText(text);
  
  return segments.map((segment, index) => {
    if (segment.type === 'text') {
      return segment.content;
    } else if (segment.type === 'link') {
      return {
        type: 'link',
        key: index,
        url: segment.url,
        text: segment.content
      };
    } else if (segment.type === 'image') {
      return {
        type: 'image',
        key: index,
        url: segment.url,
        alt: 'Image'
      };
    }
    return null;
  });
};