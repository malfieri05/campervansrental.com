'use client'

import Image from 'next/image'
import { Upload } from 'lucide-react'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  rectSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import HostEditorShell from '../HostEditorShell'
import HostTipCard from '../HostTipCard'
import { TIP_IMAGES } from '../tipImages'
import { inputCls } from '../formPrimitives'

export type ImageRow = { id: string; url: string; sort_order: number }

interface PhotosStepProps {
  images: ImageRow[]
  onUploadImage: (file: File) => Promise<void>
  onDeleteImage: (img: ImageRow) => Promise<void>
  onReorderImages: (orderedIds: string[]) => Promise<void>
  youtubeVideoUrl: string
  setYoutubeVideoUrl: (v: string) => void
}

function SortableImage({
  img,
  isCover,
  onDelete,
}: {
  img: ImageRow
  isCover: boolean
  onDelete: (img: ImageRow) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: img.id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="relative aspect-[4/3] cursor-grab overflow-hidden rounded-lg border border-neutral-200 bg-neutral-100"
      {...attributes}
      {...listeners}
    >
      <Image src={img.url} alt="" fill className="object-cover" sizes="200px" />
      {isCover && (
        <span className="absolute bottom-1 left-1 rounded bg-neutral-900/80 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
          Cover
        </span>
      )}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          onDelete(img)
        }}
        className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition-opacity hover:bg-black/80 group-hover:opacity-100"
        aria-label="Delete photo"
      >
        ✕
      </button>
    </div>
  )
}

function isValidYoutubeUrl(url: string) {
  return /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+/.test(url.trim())
}

export default function PhotosStep({
  images,
  onUploadImage,
  onDeleteImage,
  onReorderImages,
  youtubeVideoUrl,
  setYoutubeVideoUrl,
}: PhotosStepProps) {
  const sorted = [...images].sort((a, b) => a.sort_order - b.sort_order)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  )

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = sorted.findIndex((i) => i.id === active.id)
    const newIndex = sorted.findIndex((i) => i.id === over.id)
    const reordered = arrayMove(sorted, oldIndex, newIndex)
    await onReorderImages(reordered.map((i) => i.id))
  }

  const tip = (
    <HostTipCard
      imageSrc={TIP_IMAGES.photos}
      imageAlt="Campervan parked by a lake at sunset"
      body={
        <>
          <p>
            Great photos are the single biggest driver of bookings. Capture your van&apos;s exterior,
            interior, sleeping area, kitchen, and bathroom — plus a lifestyle shot or two showing the
            kind of adventure guests will have.
          </p>
          <p className="mt-2">
            Aim for 8–15 photos taken in natural light. Avoid directing guests to book through outside
            platforms in your images or captions.
          </p>
        </>
      }
    />
  )

  const coverImg = sorted[0]
  const restImgs = sorted.slice(1)

  const main = (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-neutral-900">Photos</h2>
          <p className="text-xs text-neutral-500 mt-0.5">
            Drag to reorder · first photo becomes your cover
          </p>
        </div>
        <label className="flex cursor-pointer items-center gap-1.5 rounded-full border border-neutral-900 bg-white px-4 py-2 text-sm font-semibold text-neutral-900 transition hover:bg-neutral-50">
          <Upload className="h-4 w-4" />
          Upload
          <input
            type="file"
            accept="image/*"
            multiple
            className="sr-only"
            onChange={(e) => {
              const files = Array.from(e.target.files ?? [])
              files.forEach((f) => void onUploadImage(f))
              e.target.value = ''
            }}
          />
        </label>
      </div>

      {sorted.length === 0 ? (
        <label className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-neutral-300 py-16 text-neutral-400 hover:border-neutral-500 hover:text-neutral-600 transition">
          <Upload className="h-8 w-8" />
          <span className="text-sm font-medium">Upload photos to get started</span>
          <input
            type="file"
            accept="image/*"
            multiple
            className="sr-only"
            onChange={(e) => {
              const files = Array.from(e.target.files ?? [])
              files.forEach((f) => void onUploadImage(f))
              e.target.value = ''
            }}
          />
        </label>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={sorted.map((i) => i.id)} strategy={rectSortingStrategy}>
            <div className="group/grid">
              {/* Cover image — larger */}
              {coverImg && (
                <div className="mb-3">
                  <p className="text-[0.65rem] font-bold uppercase tracking-widest text-neutral-400 mb-1">
                    Cover photo
                  </p>
                  <div className="group relative aspect-video w-full overflow-hidden rounded-xl border border-neutral-200 bg-neutral-100">
                    <SortableImage img={coverImg} isCover onDelete={onDeleteImage} />
                  </div>
                </div>
              )}

              {/* Rest — 2-col grid */}
              {restImgs.length > 0 && (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {restImgs.map((img) => (
                    <div key={img.id} className="group relative">
                      <SortableImage img={img} isCover={false} onDelete={onDeleteImage} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </SortableContext>
        </DndContext>
      )}

      <p className="text-xs text-neutral-400">
        {sorted.length} photo{sorted.length !== 1 ? 's' : ''} uploaded
      </p>

      {/* YouTube section */}
      <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-neutral-900 mb-1">Add YouTube video</h3>
        <p className="text-xs text-neutral-500 mb-3">
          Enter a YouTube URL to add a video tour to your listing.
        </p>
        <div className="flex gap-2">
          <input
            className={inputCls + ' flex-1'}
            value={youtubeVideoUrl}
            onChange={(e) => setYoutubeVideoUrl(e.target.value)}
            placeholder="https://youtube.com/watch?v=..."
          />
          <button
            type="button"
            disabled={!isValidYoutubeUrl(youtubeVideoUrl)}
            className="shrink-0 rounded-lg border border-neutral-900 px-4 py-2 text-sm font-semibold text-neutral-900 transition hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Add video
          </button>
        </div>
        {youtubeVideoUrl && !isValidYoutubeUrl(youtubeVideoUrl) && (
          <p className="mt-1.5 text-xs text-red-500">Please enter a valid YouTube URL.</p>
        )}
        {youtubeVideoUrl && isValidYoutubeUrl(youtubeVideoUrl) && (
          <p className="mt-1.5 text-xs text-emerald-600">Video URL saved.</p>
        )}
      </div>
    </div>
  )

  return <HostEditorShell main={main} tip={tip} />
}
