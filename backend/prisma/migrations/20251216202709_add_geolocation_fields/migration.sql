-- AlterTable
ALTER TABLE "companies" ADD COLUMN     "geofenceRadius" DOUBLE PRECISION DEFAULT 100,
ADD COLUMN     "latitude" DOUBLE PRECISION,
ADD COLUMN     "longitude" DOUBLE PRECISION,
ADD COLUMN     "requireGeolocation" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "time_entries" ADD COLUMN     "geofenceValid" BOOLEAN,
ADD COLUMN     "isRemoteWork" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "latitude" DOUBLE PRECISION,
ADD COLUMN     "longitude" DOUBLE PRECISION;
