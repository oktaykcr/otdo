# OTDO Kullanıcı Kılavuzu

OTDO; notlarınızı markdown veya canvas diyagramı olarak saklayan, görevleri not içine gömebileceğiniz ve hatırlatıcı/Telegram ile takip edebileceğiniz bir masaüstü uygulamasıdır. Bu kılavuz günlük kullanımı adım adım anlatır.

---

## İçindekiler

1. [İlk adımlar](#ilk-adımlar)
2. [Kenar çubuğu (Sidebar)](#kenar-çubuğu-sidebar)
3. [Çöp kutusu (Trash)](#çöp-kutusu-trash)
4. [Editör](#editör)
5. [Canvas notları](#canvas-notları)
6. [Görevler (Todos)](#görevler-todos)
7. [Hatırlatıcılar](#hatırlatıcılar)
8. [Bildirimler](#bildirimler)
9. [Dashboard ve XP](#dashboard-ve-xp)
10. [Arama ve gezinme](#arama-ve-gezinme)
11. [Graph (not haritası)](#graph-not-haritası)
12. [Dışa aktarma](#dışa-aktarma)
13. [Google Drive](#google-drive)
14. [Telegram Bot](#telegram-bot)
15. [Ayarlar](#ayarlar)
16. [Help](#help)
17. [Klavye kısayolları](#klavye-kısayolları)
18. [Sık sorulan sorular](#sık-sorulan-sorular)

---

## İlk adımlar

1. Uygulamayı başlatın (`npm run dev` veya kurulu OTDO uygulaması).
2. **Settings** → **Local Storage** bölümünden **Notes Folder Path** seçin. Markdown notlar `.md`, canvas notlar `.canvas.json` olarak bu klasörde saklanır.
3. Sidebar'dan **+** ile yeni yerel not oluşturun. Modalda **Note** (markdown) veya **Canvas** (diyagram) türünü seçin. İkon ve renk seçebilirsiniz. Mevcut bir `.md` dosyasını klasöre kopyalayabilirsiniz (path sync sonrası listede görünür).
4. İsteğe bağlı: Google Drive ve Telegram bağlantılarını Settings'ten yapılandırın.

> **Not:** Görev verileri (todo listesi) not dosyalarından ayrı tutulur; uygulama veri dizininde saklanır. Not içindeki todo blokları bu kayıtlara referans verir.

---

## Kenar çubuğu (Sidebar)

### Gizle / göster

- Sidebar başlığındaki **Hide sidebar** ile paneli kapatın.
- Editör üst barında **Show sidebar** ile yeniden açın.

### Yerel ve Drive notları

Sidebar iki ana bölüme ayrılır (başlıktaki chevron ile daraltılabilir):

| Bölüm | Simge | Açıklama |
|-------|-------|----------|
| **Local** | Hard drive | Bilgisayarınızdaki `notesPath` klasöründeki notlar |
| **Drive** | Bulut | Google Drive'a senkronize edilen notlar |

Drive bağlı değilse bölümde **Connect in Settings →** bağlantısı görünür.

### Klasörler

- Local başlığındaki klasör ikonu ile **New Folder** oluşturun (isim + renk).
- Notları sürükleyip bırakarak klasör değiştirin veya sıralayın.
- Klasörleri sürükleyerek yeniden sıralayın veya başka bir klasörün **içine** bırakın (iç içe klasör).
- Klasör sağ tık: yeniden adlandırma, renk (Important / Warning / Info / Temp), silme.

### Not satırı ve sağ tık

| Eylem | Nasıl |
|-------|-------|
| Aç | Tıkla |
| Pin / Unpin | Hover pin ikonu veya sağ tık → **Pin note** / **Unpin note** (sabitlenenler üstte) |
| Yeniden adlandır, ikon, renk | Sağ tık menüsü |
| Move to folder | Sağ tık → **Move to folder** → Root veya klasör |
| Drive'a taşı / Sync | Hover veya sağ tık → **Move to Google Drive** / **Sync to Google Drive** |
| Local'e taşı | Drive notunda → **Move to Local** |
| Çöp kutusuna taşı | Sağ tık / hover → **Move to Trash** (onay sonrası soft delete) |

Yeni not modalında **Icon** ve **Color** (renk etiketi) seçebilirsiniz.

### Takvim

Sidebar'daki **Calendar** bölümü:

- Güne tıklayarak o güne özel journal notu açın veya oluşturun.
- Noktalı günlerde not vardır; bugün accent halka ile vurgulanır.
- **Previous / Next month** ile ay değiştirin; **Today** bugüne gider ve notu açar.
- Notlar otomatik **`calendar`** klasöründe oluşur; ad formatı örn. `Jul 9, 2026`, ikon: calendar.

### Alt navigasyon

| Öğe | Açıklama |
|-----|---------|
| **Dashboard** | İstatistikler, XP, aktivite raporu |
| **Notifications** | Aktif hatırlatıcılar + geçmiş (okunmamış rozeti) |
| **Graph** | Not bağlantı haritası |
| **Settings** | Ayarlar |
| **Help** | XP tablosu, kısayollar, quick reminder örnekleri |

Overlay sayfalarda (**Esc** veya **Back**) editöre dönersiniz.

---

## Çöp kutusu (Trash)

Silinen notlar hemen yok olmaz; **soft delete** ile Trash’e taşınır.

### Nasıl çalışır?

1. Notu silin → onay → dosya `notesPath/.otdo-trash` altına taşınır; meta’da `deletedAt` tutulur.
2. Sidebar altındaki **Trash** bölümünden listeyi açın.
3. Her satırda kalan süre görünür (`Xd left` / **Purges soon**).
4. **Restore** ile geri getirin veya kalıcı silin.
5. **Empty Trash** ile tüm çöpü kalıcı temizleyin.

Klasör silindiğinde içindeki notlar da Trash’e alınır.

### Saklama süresi

Settings → **Local Storage** → **Trash retention**: **7 / 14 / 30 / 60** gün (varsayılan **14**).

Süre dolunca uygulama açılışında otomatik **purge** edilir; yalnızca o nota bağlı orphan todo’lar da temizlenebilir.

> Graph, arama ve Drive import Trash’teki notları yok sayar. Drive’da silinen dosyalar zaten trash’teyse yeniden import edilmez.

---

## Editör

### Blok türleri

Boş bir blokta **`/`** yazın; filtreleyerek komut seçin.

| Tür | Nasıl eklenir | Açıklama |
|-----|---------------|----------|
| Paragraf | Varsayılan | Düz metin |
| Başlık 1–3 | `/h1`, `/h2`, `/h3` | Bölüm başlıkları |
| Madde listesi | `/bullet` | `-` listesi |
| Numaralı liste | `/numbered` | `1.` listesi |
| Alıntı | `/quote` | Blockquote |
| Kod bloğu | `/codeblock` | Sözdizimi vurgulu çok satırlı kod |
| Tablo | `/table` | Satır/sütun tablosu |
| Ayırıcı | `/divider` | Yatay çizgi |
| Link | `/link` | URL bağlantısı |
| Todo | `/todo` | Görev bloğu |
| Today | `/today`, `bugün` | Bugünün tam tarihi |
| Date | `/date`, `tarih` | ISO `yyyy-MM-dd` |
| Time | `/time`, `saat` | `HH:mm` |

### Satır içi biçimlendirme

Metin seçtiğinizde floating toolbar görünür:

- **Kalın**, *italik*, ~~üstü çizili~~, `kod`, link
- Blok türü değiştirme (Text, Heading 1–3, Bullet, Numbered)
- Renk: Default, Red, Amber, Blue, Indigo, Green, Muted

Kısayollar: `⌘B` / `⌘I` / `⌘⇧X` / `⌘⇧E` / `⌘K` (Windows'ta `Ctrl+…`).

### Liste davranışı

- **Tab** / **Shift+Tab** — Madde listesinde girinti (0–3 seviye)
- Boş listede **Enter** — Listeden çıkıp paragrafa dön
- Satır başında **Backspace** — Başlık seviyesini düşür (h3→h2→h1→p)

### Not mention (`@`)

Başka bir nota `@` yazarak referans ekleyin. Mention menüsünden not seçin. Bu bağlantılar **Graph** sayfasında ok olarak görünür.

### Not etiketleri (#tags)

Editör üstündeki **NoteTagsBar** (markdown ve canvas):

| Eylem | Nasıl |
|-------|-------|
| Ekle | **Add tag** / `+` → etiket adı |
| Yeniden adlandır | `#etiket` tıkla → düzenle → Enter |
| Sil | Hover → `X` |

Etiketler editör aramasında ve command palette'te (`#etiket`) görünür.

> Renk etiketi (Important / Warning / Info / Temp) sidebar ikon rengidir; `#tag` metin etiketlerinden farklıdır.

### Not sabitleme

NoteTagsBar → **Pin note** / **Pinned**. Sidebar'da üstte listelenir; XP kazandırır. Sekme **Pin**'inden bağımsızdır (sekme pin yalnızca sekme çubuğunu etkiler).

### Not hatırlatıcısı

NoteTagsBar → **Set note reminder** / **Reminder** → **Note reminder** modalı.

Tetiklenince bu nottaki **açık task'ların listesi** gönderilir (masaüstü bildirimi; Telegram açıksa bot mesajı). Aynı ReminderForm: Once / Hourly / Daily / Weekly / Monthly + Telegram.

### Sekmeler

- Birden fazla notu aynı anda sekmede açabilirsiniz.
- Boş sekmede kısayol ipuçları görünür (palette, find, save, undo/redo).
- Sekmeye **sağ tık**:
  - **Split Right** — İki sütun
  - **Split Down** — Üst/alt bölme
  - **Pin** / **Unpin** — Sekmeyi sabitle
  - **Close** / **Close All**

Split görünümde her panel kendi sekmelerine sahiptir. Source paneli yatay sürüklenerek yeniden boyutlandırılır.

### Araç çubuğu (üst)

| Düğme | İşlev |
|-------|-------|
| **Search in note…** | Açık notta ara (markdown) |
| **Filter / Sort todos** | Notta todo varsa durum filtresi ve sıralama |
| **Save / Sync** | Yerel kaydet veya Drive sync |
| **Source** | Ham markdown paneli (yalnızca markdown) |
| **Export** | Not türüne göre dışa aktarma |

### Todo filtre ve sıralama

Notta en az bir todo bloğu varken üst barda:

| Kontrol | Seçenekler |
|---------|------------|
| **Filter todos by status** | All, Pending, Active, Done, Cancelled |
| **Sort todos** | Document order, Priority, Due date, Created |

Settings → **Tasks** ile birlikte:

- **Show completed todos** — All filtresinde done göster/gizle
- **Show cancelled todos** — All filtresinde cancelled göster/gizle

### Durum çubuğu (alt)

Markdown notlarda:

- **Created** / **Updated** zamanları
- Dosya boyutu, **chars**, **lines**, seçim varsa **N selected**

Kayıt durumu (**Saving…** / **Syncing…** / **Saved**) üst bardaki Save/Sync düğmesinde görünür.

### Otomatik kaydetme

- **Yerel notlar:** Settings → Auto-save delay (varsayılan ~1.5 sn; 0 = kapalı)
- **Drive notları:** Yerel kayıt + Settings → Auto-sync delay ile Drive'a yükleme

Manuel kayıt: **`⌘S`** / **`Ctrl+S`**

---

## Canvas notları

Canvas; sürükle-bırak kutucuklar ve oklarla basit diyagramlar çizmenizi sağlar. Markdown editöründen ayrı bir yüzeydir.

### Oluşturma

1. Sidebar'da **+** → **New Local Note** (veya Drive notu / command palette).
2. **Type** olarak **Canvas** seçin.
3. İsim verip oluşturun. Dosya `{isim}.canvas.json` olarak kaydedilir; sidebar'da canvas ikonu görünür.

### Araçlar

| Araç | Kısayol | İşlev |
|------|---------|-------|
| **Select** | `V` | Seç, sürükle, yeniden boyutlandır |
| **Add shape** | `B` | Tıklayınca yeni şekil ekler |
| **Connect** | `C` | Önce kaynak, sonra hedef şekle tıklayarak bağlantı çizer |

Boş alanda **çift tıklama** da yeni şekil ekler. Boş alanda sürükleyerek pan; tekerlek ile zoom; **Fit** ile tüm diyagramı sığdırın. Alt+sürükle veya orta tuş ile de pan yapılabilir.

### Şekiller

Toolbar'dan şekil seçin (seçili kutuya uygulanır; seçim yoksa yeni eklenenler için varsayılan olur):

- Yuvarlatılmış dikdörtgen
- Dikdörtgen
- Elips
- Elmas
- Paralelkenar

### Renk ve yazı boyutu

- **Şekil rengi** — Palette ikonu → açılır panelden 10 renk
- **Yazı boyutu** — `−` / `+` ile **S → M → L → XL**

Kutuya **çift tıklayarak** metin düzenleyin.

### Bağlantılar (oklar)

| Seçenek | Anlamı |
|---------|--------|
| **→** | Tek yönlü ok (kaynak → hedef) |
| **↔** | Çift yönlü ok |
| **―** | Ok yok (düz çizgi) |

- **Bağlantı rengi** — Yuvarlak renk düğmesi → ayrı panel
- Bağlantıya tıklayarak seçin; **Reverse** (veya `R`) yönü tersine çevirir
- **Delete** / **Backspace** seçili şekli veya bağlantıyı siler

Connect sırasında “Click target shape →” ipucu görünür.

### Canvas vs Graph

| | **Canvas notu** | **Graph sayfası** |
|--|-----------------|-------------------|
| Ne | Tek not içinde çizdiğiniz diyagram | Tüm notlar arası `@mention` haritası |
| Düzenleme | Evet (şekil, ok, renk) | Hayır (yalnızca görüntüleme) |
| Dosya | `.canvas.json` | Yok (anlık hesaplanır) |

---

## Görevler (Todos)

### Todo bloğu oluşturma

1. `/todo` yazın ve formu doldurun (başlık, öncelik, due date, isteğe bağlı hatırlatıcı).
2. Veya boş todo satırına başlık yazın; blur/Enter ile kayıt oluşur.

### Ana satır

- **Checkbox** — Done / pending arasında geçiş; cancelled durumunda X ile geri al
- **Başlık** — Doğrudan düzenlenebilir
- **Öncelik badge** — high / medium / low
- **Durum badge** — Pending, Active, Done, Cancelled
- **Due date** — Varsa gösterilir (gecikmiş = kırmızı, bugün = amber)
- **Chevron** — Ayrıntı panelini aç/kapat

### Ayrıntı paneli (genişletilmiş)

**Task**
- Durum butonları (Pending, Active, Done, Cancelled)
- Öncelik (high, medium, low)

**Schedule**
- Start, Due, Cancel tarih/saat alanları

**Reminder**
- Hatırlatıcı aç/kapa
- Sıklık: Once, Hourly, Daily, Weekly, Monthly
- Weekly/Monthly için gün seçici (Pzt–Paz)
- Once için tarih+saat; diğerlerinde saat
- Telegram toggle (bot yapılandırılmışsa)

**Notes** — Görev açıklaması (yeniden boyutlandırılabilir alan).

Panelden **Delete** ile görevi ve bloğu silersiniz. Todo bloğunu yalnızca silmek görevi otomatik silmez.

### Durum akışı

```
pending → in-progress → done
                    ↘ cancelled
```

Durum ikonuna tıklayarak döngüsel geçiş yapılır. Active'e alınca ve tamamlayınca XP kazanırsınız.

---

## Hatırlatıcılar

### Sıklıklar

| Sıklık | Davranış |
|--------|----------|
| **Once** | Tek seferlik tarih ve saat; tetiklenince otomatik kapanır |
| **Hourly** | Her saat, seçilen dakikada |
| **Daily** | Her gün belirlenen saatte |
| **Weekly** | Seçilen günde, belirlenen saatte |
| **Monthly** | Ayın ilk haftasında seçilen günde |

### Üç hatırlatıcı kapsamı

| Tür | Nerede | Ne gönderir |
|-----|--------|-------------|
| **Todo reminder** | Todo ayrıntı paneli | Tek görev bilgisi |
| **Note reminder** | NoteTagsBar → Reminder | Nottaki açık task listesi |
| **Quick reminder** | Command palette (`remind` / `hatırlat`) | Bağımsız metin; todo/not gerekmez |

> Hatırlatıcılar uygulama **açıkken** çalışır. Kapatıp açınca aktif hatırlatıcılar yeniden planlanır. Uyku / App Nap sonrası zamanlayıcılar **duvar saatine** göre yeniden kurulur; saat gelmeden yanlış tetiklenmemesi hedeflenir.

### Masaüstü bildirimi

- Başlık, alt başlık (öncelik · due) ve gövde metni
- Notifications geçmişine düşer
- macOS’ta seçilen **reminder sound** çalar (Settings → Notifications)

### Hatırlatıcı sesi (macOS)

Settings → **Notifications** → **Reminder sound**:

| Seçenek | Davranış |
|---------|----------|
| **System default** | Sistem bildirimi varsayılanı |
| **None (silent)** | Sessiz |
| **Ping, Glass, Hero, …** | macOS sistem sesleri (`/System/Library/Sounds`) |

**Preview** ile sesi deneyebilirsiniz (System default / None hariç).

### Telegram

İlgili formda **Send to Telegram** açıksa bot mesajı gider (todo, note veya quick). Kısa sürede yinelenen mesajlar engellenir.

---

## Bildirimler

Sidebar → **Notifications** (okunmamış sayı rozeti).

### Active reminders

Planlanmış hatırlatıcılar listelenir:

- Kapsam etiketi: **Note reminder ·**, **Quick reminder ·** veya todo
- Sıklık + **Next:** zamanı
- Telegram rozeti (açıksa)
- **Cancel reminder** ile iptal

### History

Tetiklenen bildirimler:

- **Mark as read** / **Delete** (tekil)
- Üst bar: **Mark all read**, **Clear read**

**Esc** veya **Back** → editöre dön.

Okunmamış bildirim sayısı macOS **dock badge** olarak da gösterilir.

---

## Dashboard ve XP

Sidebar → **Dashboard**.

### Experience

- Level, XP çubuğu, unvan (Novice → Legend)
- Günlük streak
- **Recent XP** listesi
- Level-up banner (**Dismiss**)
- XP kazanınca sağ altta **toast** (+XP ve level-up); Sidebar XP çubuğu kısa pulse eder

### Overview

- Notes / Todos / Done today / Reminders kartları (Reminders: todos · notes · quick)
- Todo status barı
- Deadlines: Due today, Overdue, With deadline, High priority
- Notes: Local, Drive, Calendar notes, Pinned, Folders

### Activity report

- **Daily** / **Monthly** dönem
- Created / Completed / Cancelled sayıları ve listeleri
- **Export** → CSV veya Markdown

### XP nasıl kazanılır?

| Eylem | XP |
|-------|-----|
| Todo tamamlama | +25 |
| Yüksek öncelik bonus | +10 |
| Zamanında tamamlama | +15 |
| In-progress | +5 |
| Not oluşturma | +10 |
| Not sabitleme | +5 |
| Klasör oluşturma | +5 |
| Hatırlatıcı kurma | +8 |
| Günlük streak (2. günden itibaren) | +20 |

**Not uzunluk milestone'ları:** 500 / 2.000 / 5.000 / 10.000 karakter → +15 / +30 / +50 / +80 XP

**Unvanlar:** Novice (1) → Apprentice (3) → Scribe (5) → Organizer (8) → Taskmaster (12) → Scholar (16) → Productivity Pro (20) → Knowledge Keeper (25) → Master Planner (30) → Legend (40)

---

## Arama ve gezinme

### Editör araması

Üst bardaki **Search in note…** (markdown). **`⌘F`** / **`Ctrl+F`**. Eşleşen bloklar ve etiketler vurgulanır; **Enter** / **Shift+Enter** ile gezinilir. **Esc** sorguyu temizler.

### Command palette

| Kısayol | İşlev |
|---------|-------|
| `⌘⇧P` (Mac) | Palette aç |
| `Ctrl+Shift+P` (Win/Linux) | Aynı |

Placeholder: **Search notes, create, or remind…**

| Eylem | Nasıl |
|-------|-------|
| Not aç | Ad veya `#etiket` ile filtrele → Enter |
| **New Local Note** | Listeden seç → modal |
| **New Drive Note** | Listeden seç → modal |
| **Quick reminder** | `remind` veya `hatırlat` ile başla |

**Quick reminder örnekleri:**

| Komut | Davranış |
|-------|----------|
| `remind 15:00 call mom` | Bugün 15:00 (geçtiyse yarın) |
| `remind next monday standup` | Gelecek Pazartesi 09:00 |
| `remind tomorrow 9am dentist` | Yarın belirtilen saat |
| `remind every day 08:00 meds` | Günlük tekrar |
| `remind every monday 10:00 sync` | Haftalık tekrar |
| `remind in 30 minutes stretch` | Göreli süre |
| `hatırlat 15:00 ara` | Türkçe alias |

Oluşturulunca Notifications sayfasına yönlendirilirsiniz.

---

## Graph (not haritası)

Sidebar → **Graph**.

- Her not bir düğüm; canvas notları da görünür (iç diyagram bağlantıları Graph'a yansımaz).
- `@mention` ile bağlanan **markdown** notlar arasında ok çizilir.
- Düğüme tıklayınca not editörde açılır.
- Zoom in / out / **Fit to view**; sürükle ile pan, tekerlek ile zoom.
- Header: `{N} notes`

Canvas içi oklar Graph'ta görünmez.

---

## Dışa aktarma

Editör → **Export**. Formatlar not türüne göre değişir. Tek **Save As** penceresi açılır.

### Markdown not

| Format | Kullanım |
|--------|----------|
| **HTML** | Tarayıcıda açılabilir dosya |
| **PDF** | Yazdırma / paylaşım |
| **PNG / JPG** | Görüntü |
| **Markdown** | Ham `.md` |

Varsayılan format: Settings → Default Export Format.

### Canvas not

| Format | Kullanım |
|--------|----------|
| **PNG / JPG** | Diyagram görseli |
| **JSON** | Düzenlenebilir `.canvas.json` yedeği |

### Dashboard aktivite raporu

Dashboard → Activity report → **Export** → CSV veya Markdown.

---

## Google Drive

OTDO, **sizin Google Cloud projenizin** OAuth kimlik bilgilerini kullanır. Ortak bir sunucu yok; veriler kendi Drive hesabınıza gider.

### Kurulum özeti

1. Settings → **Google Drive** → **Setup guide** (detaylı adımlar uygulama içinde).
2. Google Cloud Console'da proje oluşturun, Drive API etkinleştirin, OAuth istemcisi oluşturun.
3. Client ID ve Client Secret'ı Settings'e girin.
4. **Connect** — Tarayıcıda Google girişi; callback `http://127.0.0.1:45832/oauth/callback`
5. Drive klasör adını ayarlayın (varsayılan: `OTDO Notes`).

### Drive notu oluşturma

- Sidebar Drive → **+ New Drive Note** (Note veya Canvas)
- Command palette → **New Drive Note**
- Yerel not sağ tık / hover → **Move to Google Drive**

Drive'da `.md` ve `.canvas.json` dosyaları listelenir.

### Senkronizasyon

- Düzenlemede otomatik sync (Settings → Auto-sync delay)
- Manuel: **Save/Sync** veya `⌘S`
- Token dolunca sync sırasında tarayıcıda yeniden bağlanma açılabilir

### Import from Drive folder

Settings → Google Drive → **Import from Drive folder**:

- Klasördeki `.md` / `.canvas.json` dosyalarını indirir
- Drive'da silinen dosyalar yerel Drive notlarından kaldırılır
- Sonuç: `N imported, M updated, K removed` veya **Already up to date**

---

## Telegram Bot

Telegram; **todo**, **note reminder** ve **quick reminder** mesajları için kullanılır. Not içeriği veya Drive sync için değildir.

### Kurulum özeti

1. @BotFather'dan bot oluşturun, token alın.
2. Bota mesaj gönderin; Chat ID'nizi öğrenin (setup guide).
3. Settings → **Telegram Bot** → Token ve Chat ID.
4. **Send Test Message** ile doğrulayın.

### Bot komutları

Uygulama açıkken bot ~5 saniyede bir dinler. Listelenen görevler, notlarınıza bağlı pending todo'lardır.

| Komut | Açıklama |
|-------|----------|
| `/list` | Bekleyen görevler |
| `/today` | Bugün due date'i olanlar |
| `/search <sorgu>` | Başlık/açıklamada arama |
| `/help` | Yardım |

### Hatırlatıcı mesajları

İlgili formda Reminder → Telegram açık olmalıdır. Todo mesajında başlık, öncelik ve due date yer alır; note reminder'da açık task listesi gider.

---

## Ayarlar

### Appearance
- Tema (şu an yalnızca Dark; Light planlanıyor)
- Arayüz font boyutu

### Editor
- Satır numaraları, yazım denetimi, editör font boyutu
- Yazı alanı padding (üst/sol/sağ/alt)
- Max genişlik, yatay hizalama
- Yazı alanı sınır çizgisi (dashed border)

### Notifications
- **Reminder sound** (macOS) + **Preview**

### Tasks
- **Show completed todos**
- **Show cancelled todos**

### Local Storage
- Notes klasör yolu
- Varsayılan export formatı
- Auto-save gecikmesi (saniye; 0 = kapalı)
- **Trash retention** (7 / 14 / 30 / 60 gün)

### Google Drive
- OAuth kimlik bilgileri, klasör adı
- Auto-sync gecikmesi
- Connect / Disconnect
- **Import from Drive folder**

### Telegram Bot
- Bot token, Chat ID
- Test mesajı

---

## Help

Sidebar → **Help**:

- Experience & titles (XP tablosu, unvanlar)
- Keyboard shortcuts
- Quick reminder örnekleri
- Editor tips (`/`, `@`, `Esc`)
- Telegram komutları

Uygulama içi hızlı başvuru; bu kılavuz daha ayrıntılıdır.

---

## Klavye kısayolları

### Genel

| Kısayol | İşlev |
|---------|-------|
| `⌘S` / `Ctrl+S` | Kaydet / Drive sync |
| `⌘F` / `Ctrl+F` | Not içi arama (markdown) |
| `⌘⇧P` / `Ctrl+Shift+P` | Command palette |
| `Esc` | Overlay / modal / menü kapat (Settings, Graph, Dashboard, Notifications, Help) |

### Markdown biçimlendirme

| Kısayol | İşlev |
|---------|-------|
| `⌘B` / `Ctrl+B` | Kalın |
| `⌘I` / `Ctrl+I` | İtalik |
| `⌘⇧X` / `Ctrl+Shift+X` | Üstü çizili |
| `⌘⇧E` / `Ctrl+Shift+E` | Inline code |
| `⌘K` / `Ctrl+K` | Link ekle / düzenle |
| `⌘Z` / `Ctrl+Z` | Geri al |
| `⌘⇧Z` / `Ctrl+Shift+Z` veya `Ctrl+Y` | Yinele |

### Bloklar

| Kısayol | İşlev |
|---------|-------|
| `/` | Slash menü |
| `@` | Not mention |
| `Enter` | Yeni blok; todo'da onay |
| `Tab` / `Shift+Tab` | Liste girintisi |
| `Backspace` | Boş blokta sil / başlık düşür |

### Canvas

| Kısayol | İşlev |
|---------|-------|
| `V` | Select |
| `B` | Shape ekle |
| `C` | Connect |
| `R` | Seçili bağlantıyı ters çevir |
| `Delete` / `Backspace` | Seçili şekil veya bağlantıyı sil |
| `Esc` | Select'e dön; seçimi temizle |

---

## Sık sorulan sorular

### Notlarım nerede duruyor?

İçerik: Settings'teki **Notes Folder Path** — markdown `.md`, canvas `.canvas.json`.  
Çöp: aynı klasör altında **`.otdo-trash`**.  
Meta (klasör, etiket, tür, Drive ID, pin, `deletedAt`): uygulama veri dizini (`electron-store`).

### Silinen not geri gelir mi?

Evet — Trash’ten **Restore**. Retention süresi dolunca veya **Empty Trash** / kalıcı sil ile yok olur.

### Canvas ile Graph aynı şey mi?

Hayır. **Canvas** tek not içi diyagramdır. **Graph** tüm notlar arası `@mention` haritasıdır.

### Canvas'ta Source / arama neden yok?

Canvas JSON diyagramıdır; Source ve metin araması yalnızca markdown notlarda vardır. Canvas için **Export → PNG/JPG/JSON** kullanın.

### Quick reminder ile todo reminder farkı?

Quick reminder command palette ile oluşturulur; todo veya not gerektirmez. Todo/note reminder ilgili kayda bağlıdır.

### Görevler not silinince ne olur?

Todo kaydı store'da kalır; nottaki blok referansı kopabilir. Görevi silmek için ayrıntı panelinden **Delete** kullanın.

### Hatırlatıcı uygulama kapalıyken çalışır mı?

Hayır. OTDO açıkken planlanır ve tetiklenir. Kapatıp açınca etkin hatırlatıcılar yeniden kurulur. Arka planda açıkken uyku/App Nap sonrası yanlış erken tetiklemeyi azaltmak için zamanlayıcılar duvar saatine göre yeniden kalibre edilir.

### Hatırlatıcı sesi değişmiyor / duyulmuyor

- Settings → **Notifications** → ses seçin; **Preview** deneyin
- **None** sessizdir; **System default** OS bildirimine bağlıdır
- Ses dosyaları macOS’ta desteklenir; diğer platformlarda masaüstü bildirimi sessiz olabilir

### Drive sync "session expired" diyor

Settings → Google Drive → **Connect** ile yeniden giriş yapın. Sync sırasında tarayıcı otomatik açılabilir.

### Telegram mesaj gelmiyor

- Bot token ve Chat ID doğru mu?
- **Send Test Message** başarılı mı?
- İlgili hatırlatıcıda Telegram açık mı?
- Uygulama açık mı?

### Graph'ta bağlantı görünmüyor

`@` ile **not mention** eklemeniz gerekir. Düz metin, link veya canvas oku yeterli değildir.

### Açık tema ne zaman?

Planlanıyor; Settings'te Light şu an devre dışı.

---

## Destek ve geliştirme

Teknik detaylar, mimari ve geliştirici komutları için İngilizce [`README.md`](./README.md) dosyasına bakın.

**OTDO v1.0.0** · 2026
