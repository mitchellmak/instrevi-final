const CLOUDINARY_HOST_FRAGMENT = 'res.cloudinary.com/';

const hasTransformationSegment = (url: string) => {
  const match = url.match(/\/((image|video)\/upload)\/([^/]+)\//i);
  if (!match) {
    return false;
  }

  const segment = match[3] || '';
  return segment.includes(',') || segment.includes('_');
};

export const getCloudinaryDeliveryUrl = (url: string, kind: 'image' | 'video'): string => {
  if (!url || !url.includes(CLOUDINARY_HOST_FRAGMENT) || hasTransformationSegment(url)) {
    return url;
  }

  if (kind === 'video') {
    return url.replace('/video/upload/', '/video/upload/f_mp4,vc_h264,so_0/');
  }

  return url.replace('/image/upload/', '/image/upload/f_auto,q_auto/');
};