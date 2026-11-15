/*
 * The contents of this file are subject to the Common Public Attribution License Version 1.0 (the “License”); you may
 * not use this file except in compliance with the License. You may obtain a copy of the License at
 * https://opensource.org/license/CPAL-1.0. The License is based on the Mozilla Public License Version 1.1 but Sections
 * 14 and 15 have been added to cover use of software over a computer network and provide for limited attribution for
 * the Original Developer. In addition, Exhibit A has been modified to be consistent with Exhibit B.
 * Software distributed under the License is distributed on an “AS IS” basis, WITHOUT WARRANTY OF ANY KIND, either
 * express or implied. See the License for the specific language governing rights and limitations under the License.
 * The Original Code is FairDraw operator template.
 * The Initial Developer of the Original Code is Harrison Jones. All portions of the code written by Harrison Jones are
 * Copyright (c) 2026 Harrison Jones. All Rights Reserved.
 */
'use client';

import { useState } from 'react';
import { PrizePlaceholder } from '../illustrations';

type Image = { url: string; alt: string };

/**
 * The prize images: one large square image, and a row of thumbnails when there is more than one. Every image is in
 * the HTML; the thumbnails only choose which one is shown (with JavaScript off the first one shows).
 */
export function Gallery({ images }: { images: readonly Image[] }) {
  const [active, setActive] = useState(0);
  return (
    <div className="gallery">
      <div className="gallery-frame">
        <div className="gallery-inner">
          {images.length ? (
            images.map((img, i) => (
              <img
                key={img.url}
                className={i === active ? 'is-active' : undefined}
                src={img.url}
                alt={img.alt}
                width={600}
                height={600}
                loading={i === 0 ? 'eager' : 'lazy'}
                fetchPriority={i === 0 ? 'high' : undefined}
              />
            ))
          ) : (
            <PrizePlaceholder />
          )}
        </div>
      </div>
      {images.length > 1 ? (
        <div className="gallery-thumbs" role="group" aria-label="Prize images">
          {images.map((img, i) => (
            <button
              key={img.url}
              type="button"
              className="gallery-thumb bare"
              aria-pressed={i === active}
              aria-label={`Show image ${i + 1} of ${images.length}`}
              onClick={() => setActive(i)}
            >
              <img src={img.url} alt="" width={64} height={64} loading="lazy" />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
