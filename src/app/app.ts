import { 
  ChangeDetectionStrategy, 
  Component, 
  signal, 
  computed, 
  inject, 
  PLATFORM_ID, 
  OnInit 
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-root',
  imports: [MatIconModule],
  templateUrl: './app.html',
  styleUrl: './app.css',
  host: {
    '(window:resize)': 'onWindowResize()'
  }
})
export class App implements OnInit {
  private platformId = inject(PLATFORM_ID);

  // Total Sheets in the double-page layout (0 to 6)
  // Sheet 0: Covers (Front/Inside)
  // Sheet 1: Title / Table of Contents
  // Sheet 2: Bio / Skills
  // Sheet 3: Experience / Projects I
  // Sheet 4: Projects II / Honors
  // Sheet 5: Contact Channels / Contact Form
  // Sheet 6: Inside Back Cover / Back Cover
  totalSheets = 8;
  totalPages = 16; // 8 sheets * 2 sides

  // State Signals
  currentSheet = signal(0);
  currentPage = signal(0);
  isMobile = signal(false);
  isLampOn = signal(true);
  isLetterUnsealed = signal(false);
  isLightboxOpen = signal(false);
  isZoomed = signal(false);
  lightboxImage = signal('/F1.jpeg');
  lightboxCaption = signal('Fathy Gendy');
  lightboxSubcaption = signal('Standing proudly at Assiut University, Faculty of Computers and Information.');
  flippingSheet = signal(-1); // -1 when not flipping
  bookScale = signal(1); // Scale factor to fit any screen without cut-off
  mobileFlipClass = signal(''); // Class to trigger 3D page flips on mobile

  closeJournal() {
    this.flippingSheet.set(-1);
    this.currentSheet.set(0);
    this.currentPage.set(0);
  }

  // Contact Form Signals
  senderName = signal('');
  senderEmail = signal('');
  senderMessage = signal('');
  isSendingMessage = signal(false);
  messageSentSuccess = signal(false);

  // Dynamic 3D page edge thickness shadow for left side (stack of already flipped pages)
  leftThicknessShadow = computed(() => {
    const c = this.currentSheet();
    if (c === 0 || this.isMobile()) return 'none';
    const shadows = [];
    // Each sheet flipped adds more lines/depth
    for (let i = 1; i <= c * 2; i++) {
      shadows.push(`-${i}px ${i}px 0px #dcd0b2, -${i}px ${i}px 2px rgba(0,0,0,0.06)`);
    }
    // Grounding ambient shadow
    shadows.push(`-${c * 2 + 3}px ${c * 2 + 3}px 20px rgba(0,0,0,0.4)`);
    return shadows.join(', ');
  });

  // Dynamic 3D page edge thickness shadow for right side (stack of remaining pages)
  rightThicknessShadow = computed(() => {
    const c = this.currentSheet();
    const remaining = this.totalSheets - c;
    if (remaining <= 0 || this.isMobile()) return 'none';
    const shadows = [];
    for (let i = 1; i <= remaining * 2; i++) {
      shadows.push(`${i}px ${i}px 0px #dcd0b2, ${i}px ${i}px 2px rgba(0,0,0,0.06)`);
    }
    // Grounding ambient shadow
    shadows.push(`${remaining * 2 + 3}px ${remaining * 2 + 3}px 20px rgba(0,0,0,0.4)`);
    return shadows.join(', ');
  });

  ngOnInit() {
    this.checkResponsive();
  }

  onWindowResize() {
    this.checkResponsive();
  }

  private checkResponsive() {
    if (isPlatformBrowser(this.platformId)) {
      const width = window.innerWidth;
      const height = window.innerHeight;
      
      // Use 640px (standard tailwind mobile sm) as the threshold for mobile single-page view.
      // Tablets and iPads (width >= 640px) will display the full double-page spread scaled down.
      const mobile = width < 640;
      this.isMobile.set(mobile);
      
      // Keep indices aligned when viewport layout changes
      if (mobile) {
        // Map current sheet to page index
        this.currentPage.set(this.currentSheet() * 2);
        this.bookScale.set(1);
      } else {
        // Map current page to sheet index
        this.currentSheet.set(Math.floor(this.currentPage() / 2));

        // Calculate scale factor for desktop book to prevent vertical or horizontal cutoffs.
        // Base book dimensions are 900px width, 580px height.
        // We leave 40px padding for width and 120px for the header/viewport margin.
        const scaleW = (width - 40) / 940;
        const scaleH = (height - 120) / 600;
        const scale = Math.min(scaleW, scaleH, 1.05);
        this.bookScale.set(scale < 0.4 ? 0.4 : scale);
      }
    }
  }

  // ---- Page Navigation Methods (Desktop Spread) ----

  nextSheet() {
    const c = this.currentSheet();
    if (c < this.totalSheets - 1) {
      this.flippingSheet.set(c);
      this.currentSheet.set(c + 1);
      this.currentPage.set((c + 1) * 2);
      
      // Clear flipping state after transition animation
      setTimeout(() => {
        this.flippingSheet.set(-1);
      }, 1200);
    } else {
      this.goToSheet(0);
    }
  }

  prevSheet() {
    const c = this.currentSheet();
    if (c > 0) {
      this.flippingSheet.set(c - 1);
      this.currentSheet.set(c - 1);
      this.currentPage.set((c - 1) * 2);

      setTimeout(() => {
        this.flippingSheet.set(-1);
      }, 1200);
    }
  }

  goToSheet(index: number) {
    const current = this.currentSheet();
    if (index === current || index < 0 || index >= this.totalSheets) return;

    if (index > current) {
      this.flippingSheet.set(current);
      this.currentSheet.set(index);
      this.currentPage.set(index * 2);
    } else {
      this.flippingSheet.set(current - 1);
      this.currentSheet.set(index);
      this.currentPage.set(index * 2);
    }

    setTimeout(() => {
      this.flippingSheet.set(-1);
    }, 1200);
  }

  getSheetZIndex(index: number): number {
    const c = this.currentSheet();
    const baseZ = 10;
    if (index < c) {
      // Flipped sheets (left side stack). The most recently flipped sheet (c - 1) must be on top of the left stack.
      return baseZ + 20 + index;
    } else {
      // Unflipped sheets (right side stack). The top sheet (c) must be on top of the right stack.
      return baseZ + (this.totalSheets - index);
    }
  }

  // ---- Page Navigation Methods (Mobile Single Page) ----

  nextPage() {
    const p = this.currentPage();
    if (p < this.totalPages - 1) {
      this.mobileFlipClass.set('flipping-next');
      
      // Change content at 350ms (exactly halfway through the flip, when card is edge-on/90-deg rotated)
      setTimeout(() => {
        this.currentPage.set(p + 1);
        this.currentSheet.set(Math.floor((p + 1) / 2));
      }, 350);

      // Clean up the transition class when animation finishes
      setTimeout(() => {
        this.mobileFlipClass.set('');
      }, 700);
    } else {
      this.goToPage(0);
    }
  }

  prevPage() {
    const p = this.currentPage();
    if (p > 0) {
      this.mobileFlipClass.set('flipping-prev');

      setTimeout(() => {
        this.currentPage.set(p - 1);
        this.currentSheet.set(Math.floor((p - 1) / 2));
      }, 350);

      setTimeout(() => {
        this.mobileFlipClass.set('');
      }, 700);
    }
  }

  goToPage(index: number) {
    if (index >= 0 && index < this.totalPages) {
      const current = this.currentPage();
      if (index === current) return;

      const flipDir = index > current ? 'flipping-next' : 'flipping-prev';
      this.mobileFlipClass.set(flipDir);

      setTimeout(() => {
        this.currentPage.set(index);
        this.currentSheet.set(Math.floor(index / 2));
      }, 350);

      setTimeout(() => {
        this.mobileFlipClass.set('');
      }, 700);
    }
  }

  // ---- Lamp & Contact Logic ----

  toggleLamp() {
    this.isLampOn.update(state => !state);
  }

  unsealLetter() {
    this.isLetterUnsealed.set(true);
  }

  sendMessage() {
    if (!this.senderName() || !this.senderEmail() || !this.senderMessage()) {
      return;
    }

    this.isSendingMessage.set(true);

    // Simulate carrier pigeon flight / sending delays
    setTimeout(() => {
      this.isSendingMessage.set(false);
      this.messageSentSuccess.set(true);
      
      // Reset form fields
      this.senderName.set('');
      this.senderEmail.set('');
      this.senderMessage.set('');
    }, 2200);
  }

  resetForm() {
    this.messageSentSuccess.set(false);
    this.isLetterUnsealed.set(false);
  }

  openLightbox(image: string, caption: string, subcaption: string) {
    this.lightboxImage.set(image);
    this.lightboxCaption.set(caption);
    this.lightboxSubcaption.set(subcaption);
    this.isLightboxOpen.set(true);
  }
}
