import { createUploadthing, type FileRouter } from 'uploadthing/next';
import { UploadThingError, UTApi } from 'uploadthing/server';

const f = createUploadthing();

// AI-DEV: UploadThing file router for rental images
// <scratchpad>This handles server-side image upload configuration</scratchpad>

// Export UTApi instance for server-side uploads
export const utapi = new UTApi();

// Fake auth function - replace with your auth
const auth = () => ({ id: 'system' });

export const ourFileRouter = {
  // Rental images uploader
  rentalImages: f({
    image: {
      maxFileSize: '8MB',
      maxFileCount: 10,
    },
  })
    .middleware(async ({ req }) => {
      // This code runs on your server before upload
      const user = await auth(req);

      // If you throw, the user will not be able to upload
      if (!user) throw new UploadThingError('Unauthorized');

      // Whatever is returned here is accessible in onUploadComplete as `metadata`
      return { userId: user.id };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      // This code RUNS ON YOUR SERVER after upload
      console.log('Upload complete for userId:', metadata.userId);
      console.log('file url', file.url);

      // Return data to client
      return { uploadedBy: metadata.userId, url: file.url };
    }),

  // Profile images uploader
  profileImage: f({
    image: {
      maxFileSize: '4MB',
      maxFileCount: 1,
    },
  })
    .middleware(async ({ req }) => {
      const user = await auth(req);
      if (!user) throw new UploadThingError('Unauthorized');
      return { userId: user.id };
    })
    .onUploadComplete(async ({ file }) => {
      console.log('Profile image uploaded:', file.url);
      return { url: file.url };
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
