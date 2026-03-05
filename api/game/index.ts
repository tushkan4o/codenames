import type { VercelRequest, VercelResponse } from '@vercel/node';
import { neon } from '@neondatabase/serverless';
const WORD_LIST_RU: string[] = ["АБАЖУР","АБОНЕМЕНТ","АБОРДАЖ","АБСЕНТ","АБСОЛЮТ","АВАРИЯ","АВТОГРАФ","АВТОМАТ","АВТОСЕРВИС","АД","АДРЕНАЛИН","АЗАРТ","АЗКАБАН","АИСТ","АЙСБЕРГ","АКАДЕМИЯ","АКВАЛАНГ","АКВАРЕЛЬ","АКВАРИУМ","АККАУНТ","АККОРД","АККУМУЛЯТОР","АКТ","АКУЛА","АКЦИЯ","АЛМАЗ","АЛТАРЬ","АЛФАВИТ","АЛХИМИЯ","АЛЬКАТРАС","АЛЬПИНИЗМ","АЛЬПЫ","АЛЬЯНС","АЛЯСКА","АМАЗОНКА","АМЕТИСТ","АММИАК","АМНИСТИЯ","АМПУТАЦИЯ","АНАБИОЗ","АНАЛИЗ","АНГАР","АНЕСТЕЗИЯ","АНЕСТЕТИК","АНКЕТА","АННИГИЛЯЦИЯ","АНОРЕКСИЯ","АНТАРКТИДА","АНТИБИОТИК","АНТИСАНИТАРИЯ","АНТОЛОГИЯ","АНТРАЦИТ","АНТРЕСОЛЬ","АПЕЛЛЯЦИЯ","АПЕЛЬСИН","АПОКАЛИПСИС","АППЕНДИЦИТ","АППЕТИТ","АПТЕКА","АРБУЗ","АРЕНА","АРЕНДА","АРЕСТ","АРИСТОКРАТИЯ","АРКА","АРКТИКА","АРМРЕСТЛИНГ","АРОМАТ","АРХИВ","АРХИПЕЛАГ","АССОРТИ","АСТЕРОИД","АСТРОЛОГИЯ","АСТРОНОМИЯ","АСТРОФИЗИКА","АСФАЛЬТ","АТЕИЗМ","АТЕЛЬЕ","АТЛАНТИДА","АТЛАС","АТМОСФЕРА","АТОМ","АТТЕСТАТ","АТТРАКЦИОН","АУДИТОРИЯ","АУТИЗМ","АФЕРА","АЦЕТОН","АЭРОБИКА","АЭРОДРОМ","АЭРОПОРТ","АЭРОХОККЕЙ","БАБОЧКА","БАГ","БАГАЖНИК","БАГГИ","БАЗА","БАЙКАЛ","БАКАЛЕЯ","БАКЛАЖАН","БАЛАНДА","БАЛАНС","БАЛЬЗАМ","БАНДИТИЗМ","БАНК","БАННЕР","БАРБЕКЮ","БАРЬЕР","БАСКЕТБОЛ","БАССЕЙН","БАТАРЕЯ","БАТУТ","БАШМАК","БАШНЯ","БАЯН","БЕЗДНА","БЕЗУМИЕ","БЕЛОК","БЕНЗИН","БЕНЗОПИЛА","БЕРЕЗА","БЕРКУТ","БЕСПОРЯДОК","БЕССМЕРТИЕ","БЕССОННИЦА","БЕШЕНСТВО","БИАТЛОН","БИБЛИОТЕКА","БИБЛИЯ","БИГУДИ","БИЗНЕС","БИЛБОРД","БИНОКЛЬ","БИОХИМИЯ","БИРЖА","БИССЕКТРИСА","БИФШТЕКС","БЛЕФ","БЛОК","БОГАТСТВО","БОГОМОЛ","БОГОСЛУЖЕНИЕ","БОГОХУЛЬСТВО","БОКС","БОЛИД","БОЛОТО","БОЛЬ","БОМБА","БОР","БОРДЮР","БОРЩ","БОУЛИНГ","БРА","БРАК","БРАТСТВО","БРАУЗЕР","БРЕВНО","БРЕД","БРИЛЛИАНТ","БРИТВА","БРИФИНГ","БРЮТ","БУДДИЗМ","БУДИЛЬНИК","БУЛАВА","БУЛЬВАР","БУМАЖНИК","БУМЕРАНГ","БУРГЕР","БУРДЖ-ХАЛИФА","БУРЕВЕСТНИК","БУСЫ","БУТЕРБРОД","БУХГАЛТЕРИЯ","БЮРОКРАТИЯ","БЮСТ","ВАЛЬС","ВАННА","ВАРЕНИК","ВЕГЕТАРИАНСТВО","ВЕЛОСИПЕД","ВЕНА","ВЕНЕРА","ВЕНЕЦИЯ","ВЕНИК","ВЕНТИЛЯТОР","ВЕРА","ВЕРДИКТ","ВЕРЕТЕНО","ВЕРТИКАЛЬ","ВЕРТОЛЕТ","ВЕРФЬ","ВЕРШИНА","ВЕСЕЛЬЕ","ВЕСНА","ВЕСТИБЮЛЬ","ВЕСЫ","ВЕТЕР","ВЕТКА","ВЕЧНОСТЬ","ВЗГЛЯД","ВЗРЫВ","ВЗЯТКА","ВИЗИТКА","ВИЛКА","ВИНТОВКА","ВИОЛОНЧЕЛЬ","ВИРУС","ВИСЕЛИЦА","ВИСКИ","ВИТРИНА","ВИХРЬ","ВКУС","ВЛАСТЬ","ВОДОРОСЛЬ","ВОЗВРАТ","ВОЗДУХ","ВОЗРОЖДЕНИЕ","ВОЙНА","ВОЛГА","ВОЛНА","ВОЛЯ","ВОРОН","ВОСКРЕШЕНИЕ","ВОССТАНОВЛЕНИЕ","ВОСХОД","ВПАДИНА","ВРАЖДЕБНОСТЬ","ВЫДУМКА","ВЫПИСКА","ВЫРЕЗКА","ВЫСТРЕЛ","ВЫШИВКА","ГААГА","ГАЗ","ГАЗЕЛЬ","ГАЛКА","ГАРЛЕМ","ГАРМОНИЯ","ГАРПУН","ГАСТРОНОМИЯ","ГАУПТВАХТА","ГВОЗДИКА","ГЕЛИЙ","ГЕЛЬ","ГЕН","ГЕРМЕТИК","ГЕРОИН","ГИЛЬДИЯ","ГИННЕСС","ГИПНОЗ","ГИПСОКАРТОН","ГИРЛЯНДА","ГИТАРА","ГЛИСТ","ГЛОССАРИЙ","ГЛЫБА","ГЛЮКОЗА","ГНЕЗДО","ГНОЙ","ГОЛЛИВУД","ГОЛОВА","ГОЛОВОЛОМКА","ГОЛОГРАММА","ГОЛЬФ","ГОНДОЛА","ГОРА","ГОРЕНИЕ","ГОРИЗОНТ","ГОРИЗОНТАЛЬ","ГОРМОН","ГОРН","ГОРНОСТАЙ","ГОРОСКОП","ГОРОШИНА","ГОРЧИЦА","ГОРЯЧКА","ГОТЭМ","ГРАВИТАЦИЯ","ГРЕБЕШОК","ГРЕЙПФРУТ","ГРЕХ","ГРЕЦИЯ","ГРЕЧКА","ГРИБ","ГРИЛЬ","ГРИФ","ГРОБ","ГРУЗ","ГРУСТЬ","ГРУША","ГРЯДКА","ГРЯЗЬ","ГУЛАГ","ГУСЕНИЦА","ГУСТОТА","ДАВЛЕНИЕ","ДАКТИЛОСКОПИЯ","ДАМБА","ДАРТС","ДВЕРЬ","ДВИГАТЕЛЬ","ДВИЖЕНИЕ","ДЕВСТВЕННОСТЬ","ДЕЖАВЮ","ДЕЗОДОРАНТ","ДЕКОРАЦИЯ","ДЕКРЕТ","ДЕЛЕГАЦИЯ","ДЕЛИКАТЕС","ДЕМЕНЦИЯ","ДЕНЬГИ","ДЕПО","ДЕПРЕССИЯ","ДЕРЕВНЯ","ДЕСЕРТ","ДЕСНА","ДЕТЕКТОР","ДЖЕКПОТ","ДЗЕН","ДЗЮДО","ДИАГНОЗ","ДИАДЕМА","ДИАЛЕКТ","ДИАМЕТР","ДИАФРАГМА","ДИВАН","ДИЕТА","ДИЛЕММА","ДИНАМИКА","ДИНАМИТ","ДИНОЗАВР","ДИСК","ДИСКОТЕКА","ДИСПЕТЧЕРСКАЯ","ДИСТАНЦИЯ","ДИСТРОФИЯ","ДОБАВКА","ДОГОВОР","ДОЖДЬ","ДОКЛАД","ДОКУМЕНТ","ДОМИНО","ДОНОРСТВО","ДОПРОС","ДОРОГА","ДОСКА","ДРАМА","ДРЕВЕСИНА","ДРОБЬ","ДУБ","ДУБАЙ","ДУБЛОН","ДУШ","ДУША","ДЫНЯ","ДЫХАНИЕ","ЕВРО","ЕГИПЕТ","ЕДИНОРОГ","ЖАРА","ЖЕЛЕ","ЖЕЛЕЗО","ЖЕЛТОК","ЖЕМЧУЖИНА","ЖЕРТВОПРИНОШЕНИЕ","ЖЕСТ","ЖЕСТОКОСТЬ","ЖИВОПИСЬ","ЖИВОТ","ЖИРАФ","ЖУРНАЛИСТИКА","ЗАБОР","ЗАВЕДЕНИЕ","ЗАВИСИМОСТЬ","ЗАКАТ","ЗАКЛИНАНИЕ","ЗАКОН","ЗАКОНОДАТЕЛЬСТВО","ЗАМОК","ЗАНОЗА","ЗАПОВЕДЬ","ЗАПРАВКА","ЗАРАЖЕНИЕ","ЗАРАЗА","ЗАРЯД","ЗАТМЕНИЕ","ЗАЩИТА","ЗВЕЗДА","ЗВЕНО","ЗВЕРОБОЙ","ЗЕБРА","ЗЕЛЕНКА","ЗЕЛЕНЬ","ЗЕМЛЕРОЙКА","ЗЕМЛЯ","ЗЕНИТ","ЗЕРКАЛО","ЗЕФИР","ЗЛО","ЗМЕЯ","ЗОЛОТО","ЗОМБИРОВАНИЕ","ЗРЕНИЕ","ЗУБ","ИГЛА","ИЗУМРУД","ИЗЮМ","ИКОНА","ИКРА","ИМБИРЬ","ИМИТАЦИЯ","ИМПЕРИАЛИЗМ","ИМПЛАНТ","ИНВЕНТАРЬ","ИНДИКАТОР","ИНДОНЕЗИЯ","ИНДУЛЬГЕНЦИЯ","ИНЖЕНЕРИЯ","ИНКВИЗИЦИЯ","ИНСТИНКТ","ИНСУЛЬТ","ИНТЕЛЛЕКТ","ИНФАРКТ","ИНФЕКЦИЯ","ИНЦЕСТ","ИНЪЕКЦИЯ","ИПОТЕКА","ИСК","ИСКАЖЕНИЕ","ИСКРА","ИСЛАМ","ИСТЕРИЯ","ИСТОРИЯ","ЙОД","КАБАН","КАБЕЛЬ","КАБРИОЛЕТ","КАДЕНЦИЯ","КАЗАРМА","КАКАДУ","КАКАО","КАКТУС","КАЛЕЙДОСКОП","КАЛЬКУЛЯТОР","КАМЕНЬ","КАМЕРА","КАМЕРТОН","КАМИН","КАНАЛ","КАНАЛИЗАЦИЯ","КАНАПЕ","КАНДЕЛЯБР","КАНИСТРА","КАПИТОЛИЙ","КАПОТ","КАПОЭЙРА","КАПЮШОН","КАРАБИН","КАРАКАТИЦА","КАРАМЕЛЬ","КАРАУЛ","КАРЕ","КАРМАН","КАРНИЗ","КАРТА","КАРФАГЕН","КАРЬЕР","КАТАКЛИЗМ","КАТАСТРОФА","КАТАФАЛК","КАТОК","КАТОЛИЧЕСТВО","КАЧЕСТВО","КВАДРАТ","КВАРТИРА","КВАС","КВЕСТ","КЕНГУРУ","КЕРАМИКА","КЕТЧУП","КИБЕРПАНК","КИБЕРСПОРТ","КИВИ","КИЛИМАНДЖАРО","КИНЖАЛ","КИРПИЧ","КИСЛОТА","КИСТЬ","КИТАЙ","КИШКА","КЛАД","КЛЕВЕР","КЛЕМЕНТИН","КЛЕТКА","КЛОНИРОВАНИЕ","КЛУБ","КЛЮЧ","КЛЯТВА","КНОПКА","КНЯЖЕСТВО","КОВЧЕГ","КОДЕКС","КОДИРОВКА","КОЖА","КОЗА","КОЗЕЛ","КОЗЕРОГ","КОКАИН","КОКОН","КОКОС","КОКТЕЙЛЬ","КОЛБА","КОЛБАСА","КОЛДОВСТВО","КОЛЕБАНИЕ","КОЛЕСНИЦА","КОЛЕСО","КОЛИЗЕЙ","КОЛЛАБОРАЦИЯ","КОЛЛАЖ","КОЛОДА","КОЛОНИЯ","КОЛОННА","КОЛЬЕ","КОЛЬЦО","КОЛЯСКА","КОМА","КОМАНДИРОВКА","КОМБИНЕЗОН","КОМЕДИЯ","КОМЕТА","КОМПАНИЯ","КОМПОСТ","КОМПОСТЕР","КОМПРОМИСС","КОМФОРТ","КОНДЕНСАТ","КОНДИЦИОНЕР","КОНСПЕКТ","КОНСПИРАЦИЯ","КОНСТИТУЦИЯ","КОНТОРА","КОНФЛИКТ","КОНЬ","КООПЕРАТИВ","КООРДИНАТА","КОПТИЛЬНЯ","КОПЫТО","КОПЬЕ","КОРА","КОРАЛЛ","КОРАН","КОРЕНЬ","КОРЗИНА","КОРИАНДР","КОРИДОР","КОРМ","КОРОБКА","КОРОВА","КОРОЕД","КОРОЛЕВСТВО","КОРПОРАЦИЯ","КОРТ","КОСА","КОСМЕТИЧКА","КОСМОЛЕТ","КОСМОС","КОСТЬ","КОСТЮМ","КОТЛЕТА","КОТТЕДЖ","КОФЕ","КОФЕИН","КОШКА","КОЭФФИЦИЕНТ","КРАН","КРАПИВА","КРАТЕР","КРЕАТИВ","КРЕДИТ","КРЕМ","КРЕМАТОРИЙ","КРЕМЛЬ","КРЕПЕЖ","КРЕСТ","КРИОКАМЕРА","КРИПТОЛОГИЯ","КРИСТАЛЛ","КРОВАТЬ","КРОВОТЕЧЕНИЕ","КРУГ","КРЫЛО","КРЫША","КРЮЧОК","КУБ","КУКУРУЗНИК","КУЛАК","КУЛЕК","КУЛЬТ","КУЛЬТУРА","КУПАНИЕ","КУРС","КУРЯТНИК","ЛАБИРИНТ","ЛАВКА","ЛАГУНА","ЛАЗАНЬЯ","ЛАМПОЧКА","ЛАНДЫШ","ЛАПША","ЛАС-ВЕГАС","ЛАСКА","ЛАТЕКС","ЛАТУНЬ","ЛАТЫНЬ","ЛЕВИТАЦИЯ","ЛЕД","ЛЕЗВИЕ","ЛЕКАРСТВО","ЛЕОПАРД","ЛЕС","ЛЕСОПИЛКА","ЛИВЕНЬ","ЛИЗИНГ","ЛИКЕР","ЛИМИТ","ЛИМОН","ЛИМОНАД","ЛИМУЗИН","ЛИНЕЙКА","ЛИНЗА","ЛИНИЯ","ЛИНОЛЕУМ","ЛИПА","ЛИРА","ЛИСТ","ЛИСТВА","ЛИСТОЕД","ЛИТЕРАТУРА","ЛИФТ","ЛОБОТОМИЯ","ЛОГИКА","ЛОГИСТИКА","ЛОДКА","ЛОНДОН","ЛОТЕРЕЯ","ЛОФТ","ЛУВР","ЛУЖАЙКА","ЛУК","ЛУНА","ЛУНОХОД","ЛУЧ","ЛЫСИНА","ЛЬВИЦА","ЛЮБОВЬ","ЛЮСТРАЦИЯ","МАВЗОЛЕЙ","МАГНЕТИЗМ","МАГНИТОЛА","МАДАГАСКАР","МАЗОХИЗМ","МАЙОНЕЗ","МАЙЯ","МАЛИНА","МАНИПУЛЯЦИЯ","МАНТИЯ","МАРИХУАНА","МАРКЕТИНГ","МАРС","МАРШРУТ","МАСКАРАД","МАСЛЕНИЦА","МАСЛО","МАСОНСТВО","МАСТУРБАЦИЯ","МАТ","МАТРИЦА","МАХАОН","МАЯК","МАЯТНИК","МЕДАЛЬОН","МЕДОЕД","МЕЛОЧНОСТЬ","МЕМБРАНА","МЕНСТРУАЦИЯ","МЕРЗОСТЬ","МЕТАФИЗИКА","МЕТЕОР","МЕТЕОРИЗМ","МЕТЕОРИТ","МЕТРОНОМ","МЕХАНИЗМ","МЕШОК","МИГАЛКА","МИЗОФОБИЯ","МИКРОВОЛНОВКА","МИКРОСКОП","МИНА","МИР","МИСТИКА","МИШЕНЬ","МИШУРА","МОВЕТОН","МОГИЛА","МОГИЛЬНИК","МОДЕРАЦИЯ","МОЗАИКА","МОЛЕКУЛА","МОЛИТВА","МОЛЛЮСК","МОЛНИЯ","МОЛОКО","МОЛОЧАЙ","МОЛЬ","МОНОПОЛИЯ","МОРАТОРИЙ","МОРКОВЬ","МОРС","МОСТ","МОТОР","МОХ","МОЦАРЕЛЛА","МУКА","МУРАВЬЕД","МУРЕНА","МУСОР","МУССОН","МУСТАНГ","МУХОМОР","МУШКА","МЫШЦА","МЫШЬ","МЯСО","МЯСОРУБКА","МЯТА","НАВОДНЕНИЕ","НАГАСАКИ","НАГРАДА","НАКИДКА","НАКОНЕЧНИК","НАЛОГ","НАПЕРСТОК","НАРУШЕНИЕ","НАРЦИССИЗМ","НАРЯД","НАСЕЛЕНИЕ","НАСЛАЖДЕНИЕ","НАСМОРК","НАСОС","НАСТОЙКА","НАСТРОЙКА","НАТЮРМОРТ","НАУКА","НАХОДКА","НЕВЕСОМОСТЬ","НЕВИДИМОСТЬ","НЕЙРОХИРУРГИЯ","НЕКРОЗ","НЕКРОМАНТИЯ","НЕОТЛОЖКА","НЕПТУН","НЕРВ","НЕФТЬ","НИКТОФОБИЯ","НИМБ","НИРВАНА","НИЩЕТА","НЛО","НОВОСТЬ","НОЖКА","НОЖНИЦЫ","НОЗОФИЛИЯ","НОМЕР","НОРИ","НОРКА","НОСОК","НОТА","НОУТБУК","НОЧЬ","НЬЮ-ЙОРК","ОАЗИС","ОБИТЕЛЬ","ОБМОРОЖЕНИЕ","ОБОНЯНИЕ","ОБОЧИНА","ОБРАБОТКА","ОБРАЗ","ОБРАЗЕЦ","ОБРЕЗ","ОБРЕЗАНИЕ","ОБРЯД","ОБСЕРВАТОРИЯ","ОБУВЬ","ОБЫСК","ОВЕН","ОВСЯНКА","ОВЦА","ОВЦЕБЫК","ОГОНЬ","ОГОРОД","ОГРАЖДЕНИЕ","ОГРАНИЧЕНИЕ","ОГУРЕЦ","ОДЕЖДА","ОДИНОЧЕСТВО","ОДУВАНЧИК","ОЖЕРЕЛЬЕ","ОЖИДАНИЕ","ОКЕАН","ОКО","ОКОНЧАНИЕ","ОКТОБЕРФЕСТ","ОКУНЬ","ОЛЕНЬ","ОЛИГАРХИЯ","ОЛИМП","ОПАСНОСТЬ","ОПЕРА","ОПЕРАЦИЯ","ОПЕРЕНИЕ","ОПЕЧАТКА","ОПТИКА","ОПУШКА","ОПЫТ","ОРГАЗМ","ОРГАН","ОРИГАМИ","ОРНАМЕНТ","ОРНИТОЛОГИЯ","ОРХИДЕЯ","ОСАДА","ОСАДКИ","ОСЕНЬ","ОСТАНКИ","ОСТАНОВКА","ОСЦИЛЛОГРАФ","ОСЬМИНОГ","ОТВРАЩЕНИЕ","ОТГОЛОСОК","ОТКЛОНЕНИЕ","ОТОПЛЕНИЕ","ОТПЕЧАТОК","ОТПУСК","ОТРАЖЕНИЕ","ОТРЫЖКА","ОТТЕНОК","ОФЕРТА","ОФШОР","ОЧАГ","ОЧЕРЕДЬ","ОЧИСТИТЕЛЬ","ОЧКИ","ПАЗЛ","ПАКЕТ","ПАЛОМНИЧЕСТВО","ПАЛУБА","ПАЛЬМА","ПАМЯТНИК","ПАНАЦЕЯ","ПАНДА","ПАНДЕМИЯ","ПАНЕЛЬ","ПАНИКА","ПАНОРАМА","ПАНТЕОН","ПАНТЕРА","ПАПОРОТНИК","ПАРАЗИТИЗМ","ПАРАНОЙЯ","ПАРАШЮТ","ПАРИЖ","ПАРКУР","ПАРМЕЗАН","ПАРУС","ПАСХА","ПАТ","ПАТЕНТ","ПАУЗА","ПАЦИФИЗМ","ПАЧКА","ПЕГАС","ПЕДАЛЬ","ПЕЙДЖЕР","ПЕКИН","ПЕЛЬМЕНЬ","ПЕНСИЯ","ПЕНТАГОН","ПЕНЬ","ПЕРГАМЕНТ","ПЕРЕГОРОДКА","ПЕРЕДАЧА","ПЕРЕЕЗД","ПЕРЕКАТИ-ПОЛЕ","ПЕРЕКРЕСТОК","ПЕРЕЛОМ","ПЕРЕРОЖДЕНИЕ","ПЕРЕСМЕШНИК","ПЕРЕЦ","ПЕРИОД","ПЕРО","ПЕРФЕКЦИОНИЗМ","ПЕРЧАТКА","ПЕСОК","ПЕТУХ","ПЕЧЕНЬЕ","ПИВОВАРНЯ","ПИКАНТНОСТЬ","ПИКНИК","ПИЛОТКА","ПИНБОЛ","ПИНГВИН","ПИРАМИДА","ПИСК","ПИСЬМО","ПИТАНИЕ","ПЛАЗМА","ПЛАТА","ПЛАТЬЕ","ПЛАЦЕБО","ПЛАЧ","ПЛЕНКА","ПЛЕЧО","ПЛИНТУС","ПЛИТА","ПЛОМБА","ПЛОТИНА","ПЛОТЬ","ПЛОЩАДЬ","ПЛЯЖ","ПОБЕДА","ПОВЕСТКА","ПОГЛОЩЕНИЕ","ПОДВАЛ","ПОДГУЗНИК","ПОДЗЕМЕЛЬЕ","ПОДКОВА","ПОДЛОДКА","ПОДНОЖКА","ПОДСНЕЖНИК","ПОИСК","ПОКЕР","ПОКРЫВАЛО","ПОКРЫШКА","ПОКУПКА","ПОЛЕТ","ПОЛИГОН","ПОЛКА","ПОЛЛЮЦИЯ","ПОЛОВИНА","ПОЛОСА","ПОЛОТНО","ПОЛЬЗА","ПОЛЯРНОСТЬ","ПОМЕСТЬЕ","ПОМЕТ","ПОМИДОР","ПОПКОРН","ПОРА","ПОРАЖЕНИЕ","ПОРОДА","ПОРТАЛ","ПОРЯДОК","ПОСВЯЩЕНИЕ","ПОСОЛЬСТВО","ПОСТ","ПОСТЕЛЬ","ПОСЫЛКА","ПОТ","ПОТАСОВКА","ПОТОЛОК","ПРАВОСЛАВИЕ","ПРАВОСУДИЕ","ПРАХ","ПРЕЗЕРВАТИВ","ПРЕСТОЛ","ПРИБЫЛЬ","ПРИГОВОР","ПРИЗВАНИЕ","ПРИЗЕМЛЕНИЕ","ПРИТЧА","ПРОБОИНА","ПРОВЕТРИВАНИЕ","ПРОВОД","ПРОЕКТ","ПРОИГРЫШ","ПРОИЗВОДСТВО","ПРОКЛАДКА","ПРОКРАСТИНАЦИЯ","ПРОЛОГ","ПРОЛОНГАЦИЯ","ПРОМАХ","ПРОРОЧЕСТВО","ПРОСЛУШКА","ПРОСПЕКТ","ПРОСТРАЦИЯ","ПРОСТЫНЯ","ПРОТИВОГАЗ","ПРОТОКОЛ","ПРОФИЛЬ","ПРОЦЕНТ","ПРОЦЕССОР","ПРЫЖОК","ПРЫЩ","ПРЯДЬ","ПРЯНИК","ПСАЛОМ","ПСИХИАТРИЯ","ПТЕРОДАКТИЛЬ","ПУДРА","ПУЗО","ПУРПУР","ПУСТОТА","ПУХ","ПУШИНКА","ПУШКА","ПЯТНО","РАДАР","РАДИАЦИЯ","РАДУГА","РАЗВЕТВЛЕНИЕ","РАЗВИТИЕ","РАЗВОРОТ","РАЗРЕЗ","РАЗРЯД","РАЗУМ","РАЗЪЕМ","РАЙ","РАК","РАКЕТА","РАКОВИНА","РАРИТЕТ","РАСТВОРИТЕЛЬ","РАСЩЕЛИНА","РАТУША","РЕАНИМАЦИЯ","РЕБРО","РЕВОЛЬВЕР","РЕГЕНЕРАЦИЯ","РЕГЛАМЕНТ","РЕГРЕСС","РЕГУЛЯТОР","РЕДКОСТЬ","РЕЗИНА","РЕЗИНКА","РЕЗОНАНС","РЕЗЮМЕ","РЕИНКАРНАЦИЯ","РЕКВИЕМ","РЕКЛАМА","РЕЛИКВИЯ","РЕМЕНЬ","РЕМЕСЛО","РЕНЕССАНС","РЕСТАВРАЦИЯ","РЕФЛЕКС","РЕФОРМА","РЕЦЕПТ","РИМ","РИО-ДЕ-ЖАНЕЙРО","РИТУАЛ","РИФ","РОВ","РОЖДЕСТВО","РОЗА","РОМАН","РОСТ","РУДА","РУКАВ","РУКОЯТЬ","РУЛЕТКА","РУЛЬ","РУЧЕЙ","РУЧКА","РЫБА-МОЛОТ","РЫНОК","РЫСЬ","РЫЧАГ","РЮКЗАК","РЯЖЕНКА","РЯСА","САДИЗМ","САЙТ","САЛАТ","САМОГОН","САНИ","САНСАРА","САНТЕХНИКА","САРКОФАГ","САТУРН","САУНДТРЕК","САХАРА","СБОРНИК","СБЫТ","СВАДЬБА","СВЕКЛА","СВЕТ","СВЕТОФОР","СВЕЧА","СВИТОК","СВЯЗЬ","СДЕЛКА","СЕДЛО","СЕКВОЙЯ","СЕКРЕТ","СЕКТА","СЕКТОР","СЕМЕСТР","СЕМЯ","СЕНОВАЛ","СЕНСОР","СЕПИЯ","СЕРДЦЕ","СЕРЕБРО","СЕРИЯ","СЕРПАНТИН","СЕТЧАТКА","СЕТЬ","СИГНАЛ","СИГНАЛИЗАЦИЯ","СИДЕНИЕ","СИДР","СИЛУЭТ","СИМБИОЗ","СИМВОЛ","СИМВОЛИКА","СИМПТОМ","СИМУЛЯЦИЯ","СИНДРОМ","СИНЕВА","СИНЯК","СИРЕНА","СИРОП","СКАЗКА","СКАМЕЙКА","СКАНЕР","СКАРАБЕЙ","СКАТ","СКАЧОК","СКЕЙТБОРД","СКЕЛЕТ","СКЛЕП","СКЛОН","СКОЛОПЕНДРА","СКОРЛУПА","СКРИЖАЛЬ","СЛЕД","СЛЕЗА","СЛИЗЕНЬ","СЛУХ","СЛЮНА","СМЕРТЬ","СМОКИНГ","СНАБЖЕНИЕ","СНАДОБЬЕ","СНАРЯЖЕНИЕ","СНИМОК","СНОУБОРД","СОБАЧКА","СОБОР","СОВОК","СОЗВЕЗДИЕ","СОЛНЦЕ","СОЛЬ","СОМБРЕРО","СОПЛЯ","СОРЕВНОВАНИЕ","СОСНА","СОСТАВ","СОУС","СОЦИОПАТИЯ","СОЮЗ","СПАРИВАНИЕ","СПАРРИНГ","СПАРТА","СПЕРМАТОЗОИД","СПЕЦИЯ","СПИЧКА","СПРАВОЧНИК","СРАЖЕНИЕ","СРОК","ССЫЛКА","СТАВКА","СТАЛАГНАТ","СТАЛАКТИТ","СТАЛЬ","СТАРОСТЬ","СТАРТАП","СТАТЬЯ","СТЕКЛО","СТЕРЖЕНЬ","СТИРКА","СТИХ","СТИХИЯ","СТОЛЕТИЕ","СТОЛЕШНИЦА","СТОУНХЕНДЖ","СТРАЙК","СТРАТЕГИЯ","СТРАХОВКА","СТРЕЛА","СТРЕСС","СТРОЙКА","СУБОРДИНАЦИЯ","СУБСТАНЦИЯ","СУД","СУИЦИД","СУНДУК","СУП","СУХАРЬ","СУШКА","СФИНКС","СЧЕТ","СЧЕТЧИК","СЫРОСТЬ","ТАЗ","ТАЙМ","ТАЙНА","ТАЙНИК","ТАКСА","ТАМАГОЧИ","ТАНГО","ТАНДЕМ","ТАНК","ТАНЦПОЛ","ТАРАКАН","ТАРАНТУЛ","ТАРЕЛКА","ТАРИФ","ТАТУИРОВКА","ТЕАТР","ТЕКТОНИК","ТЕЛЕВИЗОР","ТЕЛЕКИНЕЗ","ТЕЛЕПАТИЯ","ТЕЛЕПОРТ","ТЕЛЕСКОП","ТЕМНИЦА","ТЕНЬ","ТЕПЛОВИЗОР","ТЕПЛОТА","ТЕРАПИЯ","ТЕРМИТ","ТЕРМИТНИК","ТЕРРОРИЗМ","ТЕСТИРОВАНИЕ","ТЕТИВА","ТЕХНИКА","ТЕЧЕНИЕ","ТИТАНИК","ТОКИО","ТОНКОСТЬ","ТОПЛИВО","ТОПОР","ТОРГОВЛЯ","ТОЧКА","ТРАГЕДИЯ","ТРАЕКТОРИЯ","ТРАМПЛИН","ТРАНЗАКЦИЯ","ТРАНКВИЛИЗАТОР","ТРАНСПОРТИРОВКА","ТРАПЕЗА","ТРАФИК","ТРАХЕЯ","ТРЕНИЕ","ТРЕПАНАЦИЯ","ТРЕУГОЛЬНИК","ТРИУМФ","ТРОИЦА","ТРОТУАР","ТРОЯ","ТРУБА","ТРУСОСТЬ","ТРЮМО","ТРЯПКА","ТУБЕРКУЛЕЗ","ТУМАН","ТУМБОЧКА","ТУННЕЛЬ","ТУРНИР","ТЬМА","ТЮЛЬ","ТЮРЬМА","УВЕЧЬЕ","УГОЛЬ","УГОРЬ","УЖАС","УКСУС","УЛИКА","УЛИЦА","УЛЬТРАМАРИН","УЛЬТРАФИОЛЕТ","УНИЧТОЖЕНИЕ","УПРАВЛЕНИЕ","УПРУГОСТЬ","УРАГАН","УРАЛ","УРАН","УРОБОРОС","УРОВЕНЬ","УСАДЬБА","УСКОРЕНИЕ","УСЛУГА","УТКА","УФОЛОГИЯ","ФАЗА","ФАКЕЛ","ФАЛАНГА","ФАНТАСТИКА","ФАРШИРОВКА","ФЕН","ФЕНИКС","ФЕОДАЛИЗМ","ФЕТИШ","ФЕХТОВАНИЕ","ФИКЦИЯ","ФИЛАДЕЛЬФИЯ","ФИНИК","ФИТИЛЬ","ФИТНЕС","ФИШИНГ","ФИШКА","ФЛАКОН","ФЛАМИНГО","ФЛЕШ-РОЯЛЬ","ФОКУС","ФОН","ФОРТ","ФОРТ-НОКС","ФОРТОЧКА","ФРЕШ","ФРИКАДЕЛЬКА","ФРИСТАЙЛ","ФУА-ГРА","ФУДЗИЯМА","ФУНДАМЕНТ","ФУТБОЛ","ХАМЕЛЕОН","ХАОС","ХИЖИНА","ХИРОСИМА","ХЛЕВ","ХЛОПОК","ХЛОРГЕКСИДИН","ХОГВАРТС","ХОЛОД","ХОТ-ДОГ","ХРАМ","ХРИСТИАНСТВО","ХРОМОСОМА","ХЭЛЛОУИН","ЦВЕТОКОРРЕКЦИЯ","ЦЕЗИЙ","ЦЕНА","ЦЕНТР","ЦЕПЬ","ЦЕРБЕР","ЦИВИЛИЗАЦИЯ","ЦИКЛ","ЦИЛИНДР","ЦИРКУЛЬ","ЦИТАДЕЛЬ","ЦУНАМИ","ЧАЙ","ЧАСТИЦА","ЧАСТОТА","ЧАХОТКА","ЧЕК","ЧЕРВЬ","ЧЕРНИКА","ЧЕРНОБЫЛЬ","ЧЕРНОКНИЖНИЧЕСТВО","ЧЕРНОТА","ЧЕРТОВЩИНА","ЧЕСНОК","ЧЕСОТКА","ЧЕТВЕРТЬ","ЧИЛИ","ЧИСТИЛИЩЕ","ЧИСТОТА","ЧРЕВОУГОДИЕ","ЧУГУН","ЧУМА","ЧУРЧХЕЛА","ШАБАШ","ШАМАНИЗМ","ШАМПУНЬ","ШАНТАЖ","ШАР","ШАССИ","ШАХМАТЫ","ШАШКА","ШАШКИ","ШВЕЙЦАРИЯ","ШЕДЕВР","ШЕЛКОПРЯД","ШЕРШЕНЬ","ШИЗОФРЕНИЯ","ШИНА","ШИРИНКА","ШИФРОВАНИЕ","ШИШКА","ШКАТУЛКА","ШЛЮЗ","ШЛЯПКА","ШМЕЛЬ","ШНУР","ШОКОЛАД","ШОССЕ","ШПАГАТ","ШПИОНАЖ","ШРАМ","ШТОРМ","ШУБА","ШУМ","ЭВАКУАЦИЯ","ЭВЕРЕСТ","ЭКЗОРЦИЗМ","ЭКРАН","ЭКСПЕРТИЗА","ЭКСПОРТ","ЭКСТРЕМИЗМ","ЭЛЕКТРИЧЕСТВО","ЭЛЕКТРОБУС","ЭЛЕКТРОСАМОКАТ","ЭЛЕКТРОФОРЕЗ","ЭЛИКСИР","ЭЛЬДОРАДО","ЭНЦИКЛОПЕДИЯ","ЭПИДЕМИЯ","ЭПИЦЕНТР","ЭРА","ЭРИТРОЦИТ","ЭСКАЛАТОР","ЭФИР","ЭХО","ЯБЛОЧКО","ЯГУАР","ЯДРО","ЯЗВА","ЯЗЫК","ЯЙЦЕКЛЕТКА","ЯЙЦО","ЯНТАРЬ","ЯРЛЫК","ЯРОСТЬ","ЯЩЕРИЦА","ЯЩИК"];

// --- Server-side board generation (mirrors src/lib/boardGenerator.ts) ---

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
  }
  return hash;
}

function createSeededRandom(seed: number): () => number {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface BoardColorConfig {
  totalCards: number;
  redCount: number;
  blueCount: number;
  assassinCount: number;
}

const BOARD_CONFIGS: Record<string, BoardColorConfig> = {
  '4x4': { totalCards: 16, redCount: 6, blueCount: 5, assassinCount: 1 },
  '5x5': { totalCards: 25, redCount: 10, blueCount: 9, assassinCount: 1 },
};

function generateBoardData(
  seed: string,
  boardSize: string,
  redCount?: number | null,
  blueCount?: number | null,
  assassinCount?: number | null,
): { words: string[]; colors: string[] } {
  const config = BOARD_CONFIGS[boardSize] || BOARD_CONFIGS['5x5'];
  const rCount = redCount ?? config.redCount;
  const bCount = blueCount ?? config.blueCount;
  const aCount = assassinCount ?? config.assassinCount;
  const totalCards = config.totalCards;
  const neutralCount = totalCards - rCount - bCount - aCount;

  const numericSeed = hashString(seed);
  const random = createSeededRandom(numericSeed);

  const startingTeam: 'red' | 'blue' = random() < 0.5 ? 'red' : 'blue';

  const words = [...WORD_LIST_RU];
  for (let i = words.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [words[i], words[j]] = [words[j], words[i]];
  }
  const selectedWords = words.slice(0, totalCards);

  const startCount = startingTeam === 'red' ? rCount : bCount;
  const otherCount = startingTeam === 'red' ? bCount : rCount;
  const otherTeam = startingTeam === 'red' ? 'blue' : 'red';

  const colors: string[] = [
    ...Array(startCount).fill(startingTeam),
    ...Array(otherCount).fill(otherTeam),
    ...Array(neutralCount).fill('neutral'),
    ...Array(aCount).fill('assassin'),
  ];
  for (let i = colors.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [colors[i], colors[j]] = [colors[j], colors[i]];
  }

  return { words: selectedWords, colors };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const route = req.query.route as string;
  const sql = neon(process.env.DATABASE_URL!);

  switch (route) {
    case 'clues': return handleClues(req, res, sql);
    case 'clue': return handleClueById(req, res, sql);
    case 'results': return handleResults(req, res, sql);
    case 'ratings': return handleRatings(req, res, sql);
    case 'comments': return handleComments(req, res, sql);
    case 'notifications': return handleNotifications(req, res, sql);
    case 'profile-comments': return handleProfileComments(req, res, sql);
    case 'leaderboard': return handleLeaderboard(req, res, sql);
    case 'stats': return handleUserStats(req, res, sql);
    case 'claim-session': return handleClaimSession(req, res, sql);
    case 'check-session': return handleCheckSession(req, res, sql);
    case 'save-state': return handleSaveState(req, res, sql);
    case 'captain-game': return handleCaptainGame(req, res, sql);
    case 'captain-reshuffle': return handleCaptainReshuffle(req, res, sql);
    case 'init': return handleInit(res, sql);
    case 'migrate-ids': return handleMigrateIds(res, sql);
    case 'debug': return res.json({ route, method: req.method, query: req.query, url: req.url });
    default: return res.status(400).json({ error: 'Unknown route' });
  }
}

// ==================== CLUES ====================

async function handleClues(req: VercelRequest, res: VercelResponse, sql: ReturnType<typeof neon>) {
  const action = req.query.action as string | undefined;

  if (action === 'random') {
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
    return handleRandom(req, res, sql);
  }

  if (req.method === 'GET') {
    const { userId } = req.query;
    if (!userId || typeof userId !== 'string') return res.status(400).json({ error: 'userId required' });
    const rows = await sql`SELECT c.*, u.display_name FROM clues c LEFT JOIN users u ON c.user_id = u.id WHERE c.user_id = ${userId} ORDER BY c.created_at DESC`;
    return res.json(rows.map((row: Record<string, unknown>) => ({
      id: row.id, word: row.word, number: row.number, boardSeed: row.board_seed,
      targetIndices: row.target_indices, nullIndices: row.null_indices || [],
      createdAt: Number(row.created_at), userId: row.user_id, userDisplayName: (row.display_name as string) || (row.user_id as string), wordPack: row.word_pack,
      boardSize: row.board_size, reshuffleCount: row.reshuffle_count,
      disabled: row.disabled || false, ranked: row.ranked ?? true,
      ...(row.red_count != null ? { redCount: row.red_count } : {}),
      ...(row.blue_count != null ? { blueCount: row.blue_count } : {}),
      ...(row.assassin_count != null ? { assassinCount: row.assassin_count } : {}),
    })));
  }

  if (req.method === 'POST') {
    const clue = req.body;
    if (!clue?.id || !clue?.word) return res.status(400).json({ error: 'Invalid clue data' });
    try {
      await sql`INSERT INTO users (id, display_name, created_at)
        VALUES (${clue.userId}, ${clue.userId}, ${clue.createdAt})
        ON CONFLICT (id) DO NOTHING`;
      await sql`INSERT INTO clues (id, word, number, board_seed, target_indices, null_indices, created_at, user_id, word_pack, board_size, reshuffle_count, ranked, red_count, blue_count, assassin_count)
        VALUES (${clue.id}, ${clue.word}, ${clue.number}, ${clue.boardSeed}, ${clue.targetIndices}, ${clue.nullIndices || []}, ${clue.createdAt}, ${clue.userId}, ${clue.wordPack || 'ru'}, ${clue.boardSize}, ${clue.reshuffleCount || 0}, ${clue.ranked ?? true}, ${clue.redCount || null}, ${clue.blueCount || null}, ${clue.assassinCount || null})
        ON CONFLICT (id) DO NOTHING`;
      // Clear captain game for this mode after successful submit
      if (clue.ranked) {
        await sql`UPDATE users SET captain_ranked = NULL WHERE id = ${clue.userId}`;
      } else {
        await sql`UPDATE users SET captain_casual = NULL WHERE id = ${clue.userId}`;
      }
      return res.json({ ok: true });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return res.status(500).json({ error: message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

async function handleRandom(req: VercelRequest, res: VercelResponse, sql: ReturnType<typeof neon>) {
  const { userId, wordPack, boardSize, exclude, countOnly, ranked } = req.query;
  if (!userId) return res.status(400).json({ error: 'userId required' });
  const isRanked = ranked === 'false' ? false : true;

  try {
    const solvedRows = await sql`SELECT clue_id FROM results WHERE user_id = ${userId as string}` as Record<string, unknown>[];
    const solvedIds = solvedRows.map((r: Record<string, unknown>) => r.clue_id as string);
    const solvedSet = new Set(solvedIds);

    if (countOnly === 'true') {
      let clueRows;
      if (wordPack && boardSize) {
        clueRows = await sql`SELECT id, user_id FROM clues WHERE word_pack = ${wordPack as string} AND board_size = ${boardSize as string} AND (disabled IS NOT TRUE) AND ranked = ${isRanked}`;
      } else if (wordPack) {
        clueRows = await sql`SELECT id, user_id FROM clues WHERE word_pack = ${wordPack as string} AND (disabled IS NOT TRUE) AND ranked = ${isRanked}`;
      } else if (boardSize) {
        clueRows = await sql`SELECT id, user_id FROM clues WHERE board_size = ${boardSize as string} AND (disabled IS NOT TRUE) AND ranked = ${isRanked}`;
      } else {
        clueRows = await sql`SELECT id, user_id FROM clues WHERE (disabled IS NOT TRUE) AND ranked = ${isRanked}`;
      }
      const totalCount = clueRows.length;
      const availableCount = clueRows.filter((r: Record<string, unknown>) =>
        r.user_id !== (userId as string) && !solvedSet.has(r.id as string)
      ).length;
      return res.json({ available: availableCount, total: totalCount });
    }

    const excludeIds: string[] = exclude ? (typeof exclude === 'string' ? exclude.split(',') : exclude).filter(Boolean) : [];
    const allExcluded = [...new Set([...excludeIds, ...solvedIds])];

    let rows;
    if (wordPack && boardSize) {
      rows = await sql`SELECT * FROM clues WHERE user_id != ${userId as string} AND word_pack = ${wordPack as string} AND board_size = ${boardSize as string} AND (disabled IS NOT TRUE) AND ranked = ${isRanked} ORDER BY RANDOM() LIMIT 20`;
    } else if (wordPack) {
      rows = await sql`SELECT * FROM clues WHERE user_id != ${userId as string} AND word_pack = ${wordPack as string} AND (disabled IS NOT TRUE) AND ranked = ${isRanked} ORDER BY RANDOM() LIMIT 20`;
    } else if (boardSize) {
      rows = await sql`SELECT * FROM clues WHERE user_id != ${userId as string} AND board_size = ${boardSize as string} AND (disabled IS NOT TRUE) AND ranked = ${isRanked} ORDER BY RANDOM() LIMIT 20`;
    } else {
      rows = await sql`SELECT * FROM clues WHERE user_id != ${userId as string} AND (disabled IS NOT TRUE) AND ranked = ${isRanked} ORDER BY RANDOM() LIMIT 20`;
    }

    const excludeSet = new Set(allExcluded);
    const candidates = rows.filter((r: Record<string, unknown>) => !excludeSet.has(r.id as string));
    if (candidates.length === 0) return res.json(null);
    const row = candidates[0];
    const authorRows = await sql`SELECT display_name FROM users WHERE id = ${row.user_id as string}`;
    const userDisplayName = authorRows.length > 0 ? (authorRows[0].display_name as string) : (row.user_id as string);
    const boardData = generateBoardData(
      row.board_seed as string, row.board_size as string,
      row.red_count as number | null, row.blue_count as number | null, row.assassin_count as number | null,
    );
    res.json({
      id: row.id, word: row.word, number: row.number,
      words: boardData.words, colors: boardData.colors,
      createdAt: Number(row.created_at), userId: row.user_id, userDisplayName, wordPack: row.word_pack,
      boardSize: row.board_size, reshuffleCount: row.reshuffle_count,
      ranked: row.ranked ?? true,
      ...(row.red_count != null ? { redCount: row.red_count } : {}),
      ...(row.blue_count != null ? { blueCount: row.blue_count } : {}),
      ...(row.assassin_count != null ? { assassinCount: row.assassin_count } : {}),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: message });
  }
}

// ==================== CLUE BY ID ====================

async function handleClueById(req: VercelRequest, res: VercelResponse, sql: ReturnType<typeof neon>) {
  const { id, stats, reveal } = req.query;
  if (!id || typeof id !== 'string') return res.status(400).json({ error: 'id required' });

  if (req.method === 'PATCH') {
    const { disabled, userId } = req.body || {};
    if (typeof disabled !== 'boolean' || !userId) return res.status(400).json({ error: 'disabled (boolean) and userId required' });
    const rows = await sql`SELECT user_id FROM clues WHERE id = ${id}`;
    if (rows.length === 0) return res.status(404).json({ error: 'Clue not found' });
    if (rows[0].user_id !== userId) return res.status(403).json({ error: 'Only the clue owner can toggle disabled' });
    await sql`UPDATE clues SET disabled = ${disabled} WHERE id = ${id}`;
    return res.json({ ok: true });
  }

  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  if (stats === 'true') {
    const rows = await sql`SELECT user_id, score, guessed_indices, timestamp FROM results WHERE clue_id = ${id} ORDER BY timestamp ASC`;
    if (rows.length === 0) {
      return res.json({ attempts: 0, avgScore: 0, scores: [], pickCounts: {}, details: [] });
    }
    const scores = rows.map((r: Record<string, unknown>) => Number(r.score) || 0);
    const totalScore = scores.reduce((s: number, v: number) => s + v, 0);
    const pickCounts: Record<number, number> = {};
    for (const r of rows) {
      const indices = r.guessed_indices as number[] | null;
      if (indices) { for (const idx of indices) { pickCounts[idx] = (pickCounts[idx] || 0) + 1; } }
    }
    const userIds = [...new Set(rows.map((r: Record<string, unknown>) => r.user_id as string))];
    const userNameRows = userIds.length > 0 ? await sql`SELECT id, display_name FROM users WHERE id = ANY(${userIds})` : [];
    const nameMap = new Map(userNameRows.map((r: Record<string, unknown>) => [r.id as string, r.display_name as string]));
    const details = rows.map((r: Record<string, unknown>) => ({
      userId: r.user_id as string, displayName: nameMap.get(r.user_id as string) || (r.user_id as string),
      score: Number(r.score) || 0,
      timestamp: Number(r.timestamp), guessedIndices: r.guessed_indices as number[],
    }));
    const clueRows = await sql`SELECT created_at FROM clues WHERE id = ${id}`;
    const createdAt = clueRows.length > 0 ? Number(clueRows[0].created_at) : 0;
    const ratingRows = await sql`SELECT COUNT(*)::int as count, COALESCE(AVG(rating), 0) as avg FROM ratings WHERE clue_id = ${id}`;
    const ratingsCount = ratingRows.length > 0 ? Number(ratingRows[0].count) : 0;
    const avgRating = ratingRows.length > 0 ? Math.round(Number(ratingRows[0].avg) * 10) / 10 : 0;
    return res.json({
      attempts: rows.length, avgScore: Math.round((totalScore / rows.length) * 10) / 10,
      scores, pickCounts, details, createdAt, ratingsCount, avgRating,
    });
  }

  const rows = await sql`SELECT * FROM clues WHERE id = ${id}`;
  if (rows.length === 0) return res.json(null);
  const row = rows[0];
  const authorRows = await sql`SELECT display_name FROM users WHERE id = ${row.user_id as string}`;
  const userDisplayName = authorRows.length > 0 ? (authorRows[0].display_name as string) : (row.user_id as string);
  const includeTargets = reveal === 'true';
  if (includeTargets) {
    // Reveal mode (profile/admin) — include boardSeed + targets
    res.json({
      id: row.id, word: row.word, number: row.number, boardSeed: row.board_seed,
      createdAt: Number(row.created_at), userId: row.user_id, userDisplayName, wordPack: row.word_pack,
      boardSize: row.board_size, reshuffleCount: row.reshuffle_count,
      disabled: row.disabled || false, ranked: row.ranked ?? true,
      ...(row.red_count != null ? { redCount: row.red_count } : {}),
      ...(row.blue_count != null ? { blueCount: row.blue_count } : {}),
      ...(row.assassin_count != null ? { assassinCount: row.assassin_count } : {}),
      targetIndices: row.target_indices, nullIndices: row.null_indices || [],
    });
  } else {
    // Guessing mode — return words+colors, NO boardSeed
    const boardData = generateBoardData(
      row.board_seed as string, row.board_size as string,
      row.red_count as number | null, row.blue_count as number | null, row.assassin_count as number | null,
    );
    // Check if user already has a result for this clue, or is the author
    const { userId: queryUserId } = req.query;
    let existingResult = null;
    let isAuthor = false;
    if (queryUserId && typeof queryUserId === 'string') {
      if (queryUserId === row.user_id) {
        isAuthor = true;
      } else {
        const resultRows = await sql`SELECT guessed_indices, score, correct_count, total_targets FROM results WHERE clue_id = ${id} AND user_id = ${queryUserId}`;
        if (resultRows.length > 0) {
          existingResult = {
            guessedIndices: resultRows[0].guessed_indices,
            score: Number(resultRows[0].score),
            correctCount: Number(resultRows[0].correct_count),
            totalTargets: Number(resultRows[0].total_targets),
          };
        }
      }
    }
    const includeRevealData = existingResult || isAuthor;
    res.json({
      id: row.id, word: row.word, number: row.number,
      words: boardData.words, colors: boardData.colors,
      createdAt: Number(row.created_at), userId: row.user_id, userDisplayName, wordPack: row.word_pack,
      boardSize: row.board_size, reshuffleCount: row.reshuffle_count,
      disabled: row.disabled || false, ranked: row.ranked ?? true,
      ...(row.red_count != null ? { redCount: row.red_count } : {}),
      ...(row.blue_count != null ? { blueCount: row.blue_count } : {}),
      ...(row.assassin_count != null ? { assassinCount: row.assassin_count } : {}),
      ...(includeRevealData ? {
        targetIndices: row.target_indices,
        nullIndices: row.null_indices || [],
      } : {}),
      ...(existingResult ? { existingResult } : {}),
      ...(isAuthor ? { isAuthor: true } : {}),
    });
  }
}

// ==================== RESULTS ====================

async function handleResults(req: VercelRequest, res: VercelResponse, sql: ReturnType<typeof neon>) {
  if (req.method === 'GET') {
    const { userId } = req.query;
    if (!userId || typeof userId !== 'string') return res.status(400).json({ error: 'userId required' });
    const rows = await sql`SELECT * FROM results WHERE user_id = ${userId} ORDER BY timestamp DESC`;
    return res.json(rows.map((row: Record<string, unknown>) => ({
      clueId: row.clue_id, userId: row.user_id, guessedIndices: row.guessed_indices,
      correctCount: row.correct_count, totalTargets: row.total_targets,
      score: row.score, timestamp: Number(row.timestamp), boardSize: row.board_size,
    })));
  }

  if (req.method === 'POST') {
    const result = req.body;
    if (!result?.clueId || !result?.userId) return res.status(400).json({ error: 'Invalid result data' });
    try {
      const clueRows = await sql`SELECT target_indices, null_indices, ranked FROM clues WHERE id = ${result.clueId}`;
      if (clueRows.length === 0) return res.status(404).json({ error: 'Clue not found' });
      // Server-side ranked access check
      if (clueRows[0].ranked !== false) {
        const oauthRows = await sql`SELECT provider FROM oauth_accounts WHERE user_id = ${result.userId}`;
        const givenRows = await sql`SELECT COUNT(*) as c FROM clues WHERE user_id = ${result.userId} AND ranked = false`;
        const solvedRows = await sql`SELECT COUNT(*) as c FROM results r JOIN clues cl ON r.clue_id = cl.id WHERE r.user_id = ${result.userId} AND cl.ranked = false`;
        const hasOAuth = oauthRows.length > 0;
        const casualGiven = Number(givenRows[0].c);
        const casualSolved = Number(solvedRows[0].c);
        if (!hasOAuth || casualGiven < 1 || casualSolved < 5) {
          return res.status(403).json({ error: 'ranked_access_denied' });
        }
      }
      const targetIndices: number[] = clueRows[0].target_indices as number[];
      const nullIndices: number[] = (clueRows[0].null_indices as number[]) || [];
      const guessedSet = new Set(result.guessedIndices as number[]);
      const correctCount = targetIndices.filter((i: number) => guessedSet.has(i)).length;
      await sql`INSERT INTO users (id, display_name, created_at)
        VALUES (${result.userId}, ${result.userId}, ${result.timestamp})
        ON CONFLICT (id) DO NOTHING`;
      await sql`INSERT INTO results (clue_id, user_id, guessed_indices, correct_count, total_targets, score, timestamp, board_size)
        VALUES (${result.clueId}, ${result.userId}, ${result.guessedIndices}, ${correctCount}, ${targetIndices.length}, ${result.score}, ${result.timestamp}, ${result.boardSize || null})`;
      // Notify clue author about new solve
      try {
        const clueInfo = await sql`SELECT user_id, word FROM clues WHERE id = ${result.clueId}`;
        if (clueInfo.length > 0 && clueInfo[0].user_id !== result.userId) {
          await sql`INSERT INTO notifications (user_id, type, actor_id, clue_id, clue_word, created_at)
            VALUES (${clueInfo[0].user_id}, 'new_solve', ${result.userId}, ${result.clueId}, ${clueInfo[0].word}, ${Date.now()})`;
        }
      } catch { /* notifications are best-effort */ }
      return res.json({ ok: true, targetIndices, nullIndices });
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'code' in err && (err as Record<string, unknown>).code === '23505') {
        const clueRows = await sql`SELECT target_indices, null_indices FROM clues WHERE id = ${result.clueId}`;
        const targetIndices = clueRows.length > 0 ? clueRows[0].target_indices : [];
        const nullIndices = clueRows.length > 0 ? (clueRows[0].null_indices || []) : [];
        return res.json({ ok: true, duplicate: true, targetIndices, nullIndices });
      }
      const message = err instanceof Error ? err.message : String(err);
      return res.status(500).json({ error: message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

// ==================== RATINGS ====================

async function handleRatings(req: VercelRequest, res: VercelResponse, sql: ReturnType<typeof neon>) {
  if (req.method === 'GET') {
    const { clueId, userId } = req.query;
    if (!clueId || !userId || typeof clueId !== 'string' || typeof userId !== 'string') {
      return res.status(400).json({ error: 'clueId and userId required' });
    }
    const rows = await sql`SELECT rating FROM ratings WHERE clue_id = ${clueId} AND user_id = ${userId}`;
    return res.json({ rating: rows.length > 0 ? rows[0].rating : null });
  }

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { clueId, userId, rating, reason } = req.body;
  if (!clueId || !userId) return res.status(400).json({ error: 'Missing fields' });

  if (reason) {
    await sql`INSERT INTO reports (clue_id, user_id, reason, created_at)
      VALUES (${clueId}, ${userId}, ${reason}, ${Date.now()})`;
    return res.json({ ok: true });
  }

  if (rating == null) return res.status(400).json({ error: 'Missing rating or reason' });
  await sql`INSERT INTO ratings (clue_id, user_id, rating)
    VALUES (${clueId}, ${userId}, ${rating})
    ON CONFLICT (clue_id, user_id) DO UPDATE SET rating = ${rating}`;
  res.json({ ok: true });
}

// ==================== COMMENTS ====================

async function handleComments(req: VercelRequest, res: VercelResponse, sql: ReturnType<typeof neon>) {
  if (req.method === 'GET') {
    // Comments by user (for profile)
    const { userId: commentUserId } = req.query;
    if (commentUserId && typeof commentUserId === 'string') {
      const rows = await sql`SELECT c.id, c.clue_id, c.content, c.created_at, cl.word as clue_word
        FROM comments c LEFT JOIN clues cl ON c.clue_id = cl.id
        WHERE c.user_id = ${commentUserId} ORDER BY c.created_at DESC`;
      return res.json(rows.map((r: Record<string, unknown>) => ({
        id: Number(r.id), clueId: r.clue_id as string, clueWord: (r.clue_word as string) || '',
        content: r.content as string, createdAt: Number(r.created_at),
      })));
    }

    const { clueId } = req.query;
    if (!clueId || typeof clueId !== 'string') return res.status(400).json({ error: 'clueId required' });
    const rows = await sql`SELECT c.id, c.user_id, c.content, c.created_at, u.display_name
      FROM comments c LEFT JOIN users u ON c.user_id = u.id
      WHERE c.clue_id = ${clueId} ORDER BY c.created_at DESC`;
    return res.json(rows.map((r: Record<string, unknown>) => ({
      id: Number(r.id), userId: r.user_id as string, displayName: (r.display_name as string) || (r.user_id as string),
      content: r.content as string, createdAt: Number(r.created_at),
    })));
  }

  if (req.method === 'POST') {
    const { clueId, userId, content } = req.body;
    if (!clueId || !userId || !content?.trim()) return res.status(400).json({ error: 'clueId, userId, content required' });
    const now = Date.now();
    const trimmed = content.trim();
    const rows = await sql`INSERT INTO comments (clue_id, user_id, content, created_at) VALUES (${clueId}, ${userId}, ${trimmed}, ${now}) RETURNING id`;
    // Notifications: notify clue author + mentioned users
    try {
      const clueInfo = await sql`SELECT user_id, word FROM clues WHERE id = ${clueId}`;
      const notifiedSet = new Set<string>();
      // Notify clue author about new comment
      if (clueInfo.length > 0 && clueInfo[0].user_id !== userId) {
        notifiedSet.add(clueInfo[0].user_id as string);
        await sql`INSERT INTO notifications (user_id, type, actor_id, clue_id, clue_word, created_at)
          VALUES (${clueInfo[0].user_id}, 'new_comment', ${userId}, ${clueId}, ${clueInfo[0].word}, ${now})`;
      }
      // Notify mentioned users (@[nickname] bracket format + legacy @nickname)
      const bracketMentions = trimmed.match(/@\[([^\]]+)\]/g);
      const legacyMentions = trimmed.replace(/@\[[^\]]+\]/g, '').match(/@([\wа-яА-ЯёЁ\-()]+)/g);
      const mentions = [...(bracketMentions || []), ...(legacyMentions || [])];
      if (mentions.length > 0) {
        const names = mentions.map((m: string) => m.startsWith('@[') ? m.slice(2, -1) : m.slice(1)).filter(Boolean);
        for (const name of names) {
          const userRows = await sql`SELECT id FROM users WHERE display_name = ${name}`;
          if (userRows.length > 0) {
            const mentionedId = userRows[0].id as string;
            if (mentionedId !== userId && !notifiedSet.has(mentionedId)) {
              notifiedSet.add(mentionedId);
              await sql`INSERT INTO notifications (user_id, type, actor_id, clue_id, clue_word, created_at)
                VALUES (${mentionedId}, 'mention', ${userId}, ${clueId}, ${clueInfo.length > 0 ? clueInfo[0].word : null}, ${now})`;
            }
          }
        }
      }
    } catch { /* notifications are best-effort */ }
    return res.json({ ok: true, id: Number(rows[0].id) });
  }

  if (req.method === 'DELETE') {
    const { id, adminId } = req.query;
    if (!id || !adminId || typeof adminId !== 'string') return res.status(400).json({ error: 'id and adminId required' });
    const adminRows = await sql`SELECT is_admin FROM users WHERE id = ${adminId}`;
    if (adminRows.length === 0 || !adminRows[0].is_admin) return res.status(403).json({ error: 'Not admin' });
    await sql`DELETE FROM comments WHERE id = ${Number(id)}`;
    return res.json({ ok: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

// ==================== NOTIFICATIONS ====================

async function handleNotifications(req: VercelRequest, res: VercelResponse, sql: ReturnType<typeof neon>) {
  if (req.method === 'GET') {
    const { userId } = req.query;
    if (!userId || typeof userId !== 'string') return res.status(400).json({ error: 'userId required' });
    const rows = await sql`SELECT n.id, n.type, n.actor_id, n.clue_id, n.clue_word, n.created_at, n.read, u.display_name as actor_name
      FROM notifications n LEFT JOIN users u ON n.actor_id = u.id
      WHERE n.user_id = ${userId} ORDER BY n.created_at DESC LIMIT 50`;
    return res.json(rows.map((r: Record<string, unknown>) => ({
      id: Number(r.id), type: r.type as string, actorId: r.actor_id as string,
      actorName: (r.actor_name as string) || (r.actor_id as string),
      clueId: r.clue_id as string, clueWord: r.clue_word as string,
      createdAt: Number(r.created_at), read: r.read as boolean,
    })));
  }

  if (req.method === 'POST') {
    const { userId, action } = req.body;
    if (!userId) return res.status(400).json({ error: 'userId required' });
    if (action === 'read_all') {
      await sql`UPDATE notifications SET read = true WHERE user_id = ${userId}`;
      return res.json({ ok: true });
    }
    if (action === 'read' && req.body.id) {
      await sql`UPDATE notifications SET read = true WHERE id = ${Number(req.body.id)} AND user_id = ${userId}`;
      return res.json({ ok: true });
    }
    if (action === 'clear_all') {
      await sql`DELETE FROM notifications WHERE user_id = ${userId}`;
      return res.json({ ok: true });
    }
    return res.status(400).json({ error: 'Unknown action' });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

// ==================== PROFILE COMMENTS ====================

async function handleProfileComments(req: VercelRequest, res: VercelResponse, sql: ReturnType<typeof neon>) {
  if (req.method === 'GET') {
    const { profileUserId } = req.query;
    if (!profileUserId || typeof profileUserId !== 'string') return res.status(400).json({ error: 'profileUserId required' });
    const rows = await sql`SELECT pc.id, pc.author_id, pc.content, pc.created_at, u.display_name
      FROM profile_comments pc LEFT JOIN users u ON pc.author_id = u.id
      WHERE pc.profile_user_id = ${profileUserId} ORDER BY pc.created_at DESC`;
    return res.json(rows.map((r: Record<string, unknown>) => ({
      id: Number(r.id), authorId: r.author_id as string, displayName: (r.display_name as string) || (r.author_id as string),
      content: r.content as string, createdAt: Number(r.created_at),
    })));
  }

  if (req.method === 'POST') {
    const { profileUserId, authorId, content } = req.body;
    if (!profileUserId || !authorId || !content?.trim()) return res.status(400).json({ error: 'profileUserId, authorId, content required' });
    const now = Date.now();
    const trimmed = content.trim();
    const rows = await sql`INSERT INTO profile_comments (profile_user_id, author_id, content, created_at) VALUES (${profileUserId}, ${authorId}, ${trimmed}, ${now}) RETURNING id`;
    // Notify profile owner about new comment (if not self)
    try {
      if (profileUserId !== authorId) {
        await sql`INSERT INTO notifications (user_id, type, actor_id, created_at)
          VALUES (${profileUserId}, 'profile_comment', ${authorId}, ${now})`;
      }
    } catch { /* best-effort */ }
    return res.json({ ok: true, id: Number(rows[0].id) });
  }

  if (req.method === 'DELETE') {
    const { id, adminId } = req.query;
    if (!id || !adminId || typeof adminId !== 'string') return res.status(400).json({ error: 'id and adminId required' });
    const adminRows = await sql`SELECT is_admin FROM users WHERE id = ${adminId}`;
    if (adminRows.length === 0 || !adminRows[0].is_admin) return res.status(403).json({ error: 'Not admin' });
    await sql`DELETE FROM profile_comments WHERE id = ${Number(id)}`;
    return res.json({ ok: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

// ==================== LEADERBOARD ====================

async function handleLeaderboard(req: VercelRequest, res: VercelResponse, sql: ReturnType<typeof neon>) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { boardSize } = req.query;
  let clues: Record<string, unknown>[];
  let results: Record<string, unknown>[];

  if (boardSize && typeof boardSize === 'string') {
    clues = await sql`SELECT id, user_id, number, word, ranked, created_at FROM clues WHERE board_size = ${boardSize}`;
    const clueIds = clues.map((c) => c.id as string);
    if (clueIds.length > 0) {
      results = await sql`SELECT clue_id, user_id, score, guessed_indices FROM results WHERE (board_size = ${boardSize} OR clue_id = ANY(${clueIds}))`;
    } else {
      results = await sql`SELECT clue_id, user_id, score, guessed_indices FROM results WHERE board_size = ${boardSize}`;
    }
  } else {
    clues = await sql`SELECT id, user_id, number, word, ranked, created_at FROM clues`;
    results = await sql`SELECT clue_id, user_id, score, guessed_indices FROM results`;
  }

  const clueRankedMap = new Map<string, boolean>();
  for (const c of clues) { clueRankedMap.set(c.id as string, c.ranked !== false); }

  const rankedCluesByUser = new Map<string, typeof clues>();
  for (const c of clues) {
    if (c.ranked === false) continue;
    const uid = c.user_id as string;
    if (!rankedCluesByUser.has(uid)) rankedCluesByUser.set(uid, []);
    rankedCluesByUser.get(uid)!.push(c);
  }

  const spymasters = Array.from(rankedCluesByUser.entries()).map(([userId, userClues]) => {
    const nonZeroClues = userClues.filter((c) => Number(c.number) > 0);
    const avgWordsPerClue = nonZeroClues.length > 0
      ? nonZeroClues.reduce((s, c) => s + Number(c.number), 0) / nonZeroClues.length : 0;
    const clueIds = new Set(userClues.map((c) => c.id as string));
    const othersResults = results.filter((r) => clueIds.has(r.clue_id as string) && r.user_id !== userId);
    const avgScoreOnClues = othersResults.length > 0
      ? othersResults.reduce((s, r) => s + (Number(r.score) || 0), 0) / othersResults.length : 0;
    return {
      userId, cluesGiven: userClues.length,
      avgWordsPerClue: Math.round(avgWordsPerClue * 10) / 10,
      avgScoreOnClues: Math.round(avgScoreOnClues * 10) / 10,
    };
  }).sort((a, b) => b.avgScoreOnClues - a.avgScoreOnClues);

  const rankedResultsByUser = new Map<string, typeof results>();
  for (const r of results) {
    if (!clueRankedMap.get(r.clue_id as string)) continue;
    const uid = r.user_id as string;
    if (!rankedResultsByUser.has(uid)) rankedResultsByUser.set(uid, []);
    rankedResultsByUser.get(uid)!.push(r);
  }

  const guessers = Array.from(rankedResultsByUser.entries()).map(([userId, userResults]) => {
    const avgWordsPicked = userResults.reduce((s, r) => s + ((r.guessed_indices as number[])?.length || 0), 0) / userResults.length;
    const avgScore = userResults.reduce((s, r) => s + (Number(r.score) || 0), 0) / userResults.length;
    return {
      userId, cluesSolved: userResults.length,
      avgWordsPicked: Math.round(avgWordsPicked * 10) / 10,
      avgScore: Math.round(avgScore * 10) / 10,
    };
  }).sort((a, b) => b.avgScore - a.avgScore);

  const resultsByClue = new Map<string, typeof results>();
  for (const r of results) {
    const cid = r.clue_id as string;
    if (!resultsByClue.has(cid)) resultsByClue.set(cid, []);
    resultsByClue.get(cid)!.push(r);
  }

  const ratings: Record<string, unknown>[] = await sql`SELECT clue_id, rating FROM ratings`;
  const ratingsByClue = new Map<string, number[]>();
  for (const r of ratings) {
    const cid = r.clue_id as string;
    if (!ratingsByClue.has(cid)) ratingsByClue.set(cid, []);
    ratingsByClue.get(cid)!.push(Number(r.rating));
  }

  const clueStats = clues.map((c) => {
    const clueResults = resultsByClue.get(c.id as string) || [];
    const attempts = clueResults.length;
    const avgScore = attempts > 0
      ? Math.round(clueResults.reduce((s, r) => s + (Number(r.score) || 0), 0) / attempts * 10) / 10 : 0;
    const clueRatings = ratingsByClue.get(c.id as string) || [];
    const ratingsCount = clueRatings.length;
    const avgRating = ratingsCount > 0
      ? Math.round(clueRatings.reduce((s, v) => s + v, 0) / ratingsCount * 10) / 10 : 0;
    return {
      id: c.id as string, word: c.word as string, number: Number(c.number),
      userId: c.user_id as string, ranked: c.ranked ?? true,
      attempts, avgScore, createdAt: Number(c.created_at) || 0, ratingsCount, avgRating,
    };
  }).sort((a, b) => b.attempts - a.attempts);

  res.json({ spymasters, guessers, clueStats });
}

// ==================== USER STATS ====================

async function handleUserStats(req: VercelRequest, res: VercelResponse, sql: ReturnType<typeof neon>) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  // Player search for mention autocomplete
  const { search } = req.query;
  if (search && typeof search === 'string') {
    const pattern = `%${search}%`;
    const rows = await sql`SELECT id, display_name FROM users WHERE display_name ILIKE ${pattern} LIMIT 10`;
    return res.json(rows.map((r: Record<string, unknown>) => ({ id: r.id as string, displayName: r.display_name as string })));
  }

  const { userId } = req.query;
  if (!userId || typeof userId !== 'string') return res.status(400).json({ error: 'userId required' });

  const userRows = await sql`SELECT display_name FROM users WHERE id = ${userId}`;
  const displayName = userRows.length > 0 ? (userRows[0].display_name as string) : userId;

  const clues = await sql`SELECT id, number FROM clues WHERE user_id = ${userId}`;
  const cluesGiven = clues.length;
  const avgWordsPerClue = cluesGiven > 0
    ? clues.reduce((s: number, c: Record<string, unknown>) => s + (Number(c.number) || 0), 0) / cluesGiven : 0;

  let avgScoreOnClues = 0;
  if (cluesGiven > 0) {
    const clueIds = clues.map((c: Record<string, unknown>) => c.id as string);
    const othersResults = await sql`SELECT score FROM results WHERE clue_id = ANY(${clueIds}) AND user_id != ${userId}`;
    if (othersResults.length > 0) {
      avgScoreOnClues = othersResults.reduce((s: number, r: Record<string, unknown>) => s + (Number(r.score) || 0), 0) / othersResults.length;
    }
  }

  const myResults = await sql`SELECT score, guessed_indices FROM results WHERE user_id = ${userId}`;
  const cluesSolved = myResults.length;
  const avgWordsPicked = cluesSolved > 0
    ? myResults.reduce((s: number, r: Record<string, unknown>) => s + ((r.guessed_indices as number[])?.length || 0), 0) / cluesSolved : 0;
  const avgScore = cluesSolved > 0
    ? myResults.reduce((s: number, r: Record<string, unknown>) => s + (Number(r.score) || 0), 0) / cluesSolved : 0;

  res.json({
    displayName, cluesGiven, avgWordsPerClue: Math.round(avgWordsPerClue * 10) / 10,
    avgScoreOnClues: Math.round(avgScoreOnClues * 10) / 10, cluesSolved,
    avgWordsPicked: Math.round(avgWordsPicked * 10) / 10, avgScore: Math.round(avgScore * 10) / 10,
  });
}

// ==================== SESSION CLAIM / CHECK ====================

async function handleClaimSession(req: VercelRequest, res: VercelResponse, sql: ReturnType<typeof neon>) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { userId, sessionId } = req.body;
  if (!userId || !sessionId) return res.status(400).json({ error: 'userId and sessionId required' });
  try {
    // Read saved roaming state before claiming
    const rows = await sql`SELECT session_url, session_state FROM users WHERE id = ${userId}`;
    const savedUrl = rows.length > 0 ? (rows[0].session_url as string | null) : null;
    const savedState = rows.length > 0 ? (rows[0].session_state as Record<string, unknown> | null) : null;
    // Claim and clear roaming state (consumed)
    await sql`UPDATE users SET active_session = ${sessionId}, session_url = NULL, session_state = NULL WHERE id = ${userId}`;
    res.json({ ok: true, savedUrl, savedState });
  } catch {
    res.json({ ok: true, savedUrl: null, savedState: null });
  }
}

async function handleCheckSession(req: VercelRequest, res: VercelResponse, sql: ReturnType<typeof neon>) {
  const { userId, sessionId } = req.query;
  if (!userId || typeof userId !== 'string' || !sessionId || typeof sessionId !== 'string') {
    return res.status(400).json({ error: 'userId and sessionId required' });
  }
  try {
    const rows = await sql`SELECT active_session FROM users WHERE id = ${userId}`;
    if (rows.length === 0) return res.json({ active: true });
    const active = !rows[0].active_session || rows[0].active_session === sessionId;
    res.json({ active });
  } catch {
    res.json({ active: true }); // column may not exist yet
  }
}

// ==================== SAVE SESSION STATE ====================

async function handleSaveState(req: VercelRequest, res: VercelResponse, sql: ReturnType<typeof neon>) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { userId, sessionId, url, state } = req.body;
  if (!userId || !sessionId) return res.status(400).json({ error: 'userId and sessionId required' });
  try {
    // Only save if this tab still owns the session (prevents evicted tabs from overwriting)
    await sql`
      UPDATE users
      SET session_url = ${url ?? null}, session_state = ${state ? JSON.stringify(state) : null}
      WHERE id = ${userId} AND active_session = ${sessionId}
    `;
    res.json({ ok: true });
  } catch {
    res.json({ ok: true });
  }
}

// ==================== CAPTAIN GAME (server-side seed lock) ====================

function generateServerSeed(): string {
  const now = new Date();
  const datePart = now.toISOString().slice(0, 10);
  const randomPart = Math.random().toString(36).slice(2, 8);
  return `${datePart}-${randomPart}`;
}

async function handleCaptainGame(req: VercelRequest, res: VercelResponse, sql: ReturnType<typeof neon>) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { userId, ranked, params } = req.body;
  if (!userId) return res.status(400).json({ error: 'userId required' });

  try {
    let rows;
    try {
      rows = await sql`SELECT captain_ranked, captain_casual, captain_active FROM users WHERE id = ${userId}`;
    } catch {
      // Columns might not exist yet — create them and retry
      await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS captain_ranked JSONB`;
      await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS captain_casual JSONB`;
      await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS captain_active TEXT`;
      rows = await sql`SELECT captain_ranked, captain_casual, captain_active FROM users WHERE id = ${userId}`;
    }
    if (rows.length === 0) return res.status(404).json({ error: 'User not found' });

    // Determine mode: explicit ranked param (from SetupPage) or stored active mode (from ClueGivingPage)
    let isRanked: boolean;
    if (ranked !== undefined && ranked !== null) {
      isRanked = !!ranked;
      // Set active mode
      await sql`UPDATE users SET captain_active = ${isRanked ? 'ranked' : 'casual'} WHERE id = ${userId}`;
    } else {
      // Use stored active mode, default to ranked
      isRanked = (rows[0].captain_active || 'ranked') === 'ranked';
    }

    const col = isRanked ? 'captain_ranked' : 'captain_casual';
    const raw = rows[0][col];
    // Handle JSONB: neon driver may return parsed object or string
    const existing: { seed: string; params: string; reshuffleCount: number } | null =
      typeof raw === 'string' ? JSON.parse(raw) : (raw as { seed: string; params: string; reshuffleCount: number } | null);
    if (existing?.seed) {
      return res.json({ ...existing, ranked: isRanked });
    }

    // Create new captain game with server-generated seed
    const game = { seed: generateServerSeed(), params: params || '', reshuffleCount: 0 };
    const gameJson = JSON.stringify(game);
    if (isRanked) {
      await sql`UPDATE users SET captain_ranked = ${gameJson}::jsonb WHERE id = ${userId}`;
    } else {
      await sql`UPDATE users SET captain_casual = ${gameJson}::jsonb WHERE id = ${userId}`;
    }
    return res.json({ ...game, ranked: isRanked });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ error: message });
  }
}

async function handleCaptainReshuffle(req: VercelRequest, res: VercelResponse, sql: ReturnType<typeof neon>) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ error: 'userId required' });

  try {
    const rows = await sql`SELECT captain_ranked, captain_casual, captain_active FROM users WHERE id = ${userId}`;
    if (rows.length === 0) return res.status(404).json({ error: 'User not found' });

    const isRanked = (rows[0].captain_active || 'ranked') === 'ranked';
    const col = isRanked ? 'captain_ranked' : 'captain_casual';

    const raw = rows[0][col];
    const existing: { seed: string; params: string; reshuffleCount: number } | null =
      typeof raw === 'string' ? JSON.parse(raw) : (raw as { seed: string; params: string; reshuffleCount: number } | null);
    const newSeed = generateServerSeed();
    const newCount = (existing?.reshuffleCount || 0) + 1;
    const game = { seed: newSeed, params: existing?.params || '', reshuffleCount: newCount };

    const gameJson = JSON.stringify(game);
    if (isRanked) {
      await sql`UPDATE users SET captain_ranked = ${gameJson}::jsonb WHERE id = ${userId}`;
    } else {
      await sql`UPDATE users SET captain_casual = ${gameJson}::jsonb WHERE id = ${userId}`;
    }
    return res.json({ ...game, ranked: isRanked });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ error: message });
  }
}

// ==================== MIGRATE CLUE IDS ====================

async function handleMigrateIds(res: VercelResponse, sql: ReturnType<typeof neon>) {
  try {
    // Drop FK constraints so we can update clue IDs
    await sql`ALTER TABLE results DROP CONSTRAINT IF EXISTS results_clue_id_fkey`;
    await sql`ALTER TABLE ratings DROP CONSTRAINT IF EXISTS ratings_clue_id_fkey`;
    await sql`ALTER TABLE reports DROP CONSTRAINT IF EXISTS reports_clue_id_fkey`;

    // Get all clues
    const clues = await sql`SELECT id, created_at FROM clues`;
    let updated = 0;

    for (const clue of clues) {
      const oldId = clue.id as string;
      // Generate new ID: {timestamp}-{random8}
      const rand = Math.random().toString(36).slice(2, 10);
      const newId = `${clue.created_at}-${rand}`;

      // Update child tables first, then parent
      await sql`UPDATE results SET clue_id = ${newId} WHERE clue_id = ${oldId}`;
      await sql`UPDATE ratings SET clue_id = ${newId} WHERE clue_id = ${oldId}`;
      await sql`UPDATE reports SET clue_id = ${newId} WHERE clue_id = ${oldId}`;
      await sql`UPDATE clues SET id = ${newId} WHERE id = ${oldId}`;
      updated++;
    }

    // Re-add FK constraints
    await sql`ALTER TABLE results ADD CONSTRAINT results_clue_id_fkey FOREIGN KEY (clue_id) REFERENCES clues(id)`;
    await sql`ALTER TABLE ratings ADD CONSTRAINT ratings_clue_id_fkey FOREIGN KEY (clue_id) REFERENCES clues(id)`;
    await sql`ALTER TABLE reports ADD CONSTRAINT reports_clue_id_fkey FOREIGN KEY (clue_id) REFERENCES clues(id)`;

    res.json({ ok: true, updated });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: message });
  }
}

// ==================== DB INIT ====================

async function handleInit(res: VercelResponse, sql: ReturnType<typeof neon>) {
  try {
    await sql`CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, display_name TEXT NOT NULL, created_at BIGINT NOT NULL, preferences JSONB DEFAULT '{}')`;
    await sql`CREATE TABLE IF NOT EXISTS clues (id TEXT PRIMARY KEY, word TEXT NOT NULL, number INT NOT NULL, board_seed TEXT NOT NULL, target_indices INT[] NOT NULL, created_at BIGINT NOT NULL, user_id TEXT NOT NULL REFERENCES users(id), word_pack TEXT NOT NULL, board_size TEXT NOT NULL, reshuffle_count INT DEFAULT 0)`;
    await sql`CREATE TABLE IF NOT EXISTS results (id SERIAL PRIMARY KEY, clue_id TEXT NOT NULL REFERENCES clues(id), user_id TEXT NOT NULL REFERENCES users(id), guessed_indices INT[] NOT NULL, correct_count INT NOT NULL, total_targets INT NOT NULL, score INT NOT NULL, timestamp BIGINT NOT NULL, board_size TEXT, UNIQUE(clue_id, user_id))`;
    await sql`CREATE TABLE IF NOT EXISTS ratings (clue_id TEXT NOT NULL REFERENCES clues(id), user_id TEXT NOT NULL REFERENCES users(id), rating INT NOT NULL, PRIMARY KEY (clue_id, user_id))`;
    await sql`ALTER TABLE clues ADD COLUMN IF NOT EXISTS null_indices INT[] DEFAULT '{}'`;
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS password TEXT`;
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false`;
    await sql`CREATE TABLE IF NOT EXISTS reports (id SERIAL PRIMARY KEY, clue_id TEXT NOT NULL REFERENCES clues(id), user_id TEXT NOT NULL REFERENCES users(id), reason TEXT NOT NULL, created_at BIGINT NOT NULL)`;
    await sql`ALTER TABLE clues ADD COLUMN IF NOT EXISTS disabled BOOLEAN DEFAULT false`;
    await sql`ALTER TABLE clues ADD COLUMN IF NOT EXISTS ranked BOOLEAN DEFAULT true`;
    await sql`ALTER TABLE clues ADD COLUMN IF NOT EXISTS red_count INT`;
    await sql`ALTER TABLE clues ADD COLUMN IF NOT EXISTS blue_count INT`;
    await sql`ALTER TABLE clues ADD COLUMN IF NOT EXISTS assassin_count INT`;
    await sql`CREATE TABLE IF NOT EXISTS oauth_accounts (provider TEXT NOT NULL, provider_id TEXT NOT NULL, user_id TEXT NOT NULL REFERENCES users(id), email TEXT, provider_name TEXT, linked_at BIGINT NOT NULL, PRIMARY KEY (provider, provider_id))`;
    await sql`CREATE INDEX IF NOT EXISTS idx_oauth_user ON oauth_accounts(user_id)`;
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS session_version INT DEFAULT 0`;
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS active_session TEXT`;
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS session_url TEXT`;
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS session_state JSONB`;
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS captain_ranked JSONB`;
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS captain_casual JSONB`;
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS captain_active TEXT`;
    await sql`CREATE TABLE IF NOT EXISTS comments (id SERIAL PRIMARY KEY, clue_id TEXT NOT NULL REFERENCES clues(id), user_id TEXT NOT NULL REFERENCES users(id), content TEXT NOT NULL, created_at BIGINT NOT NULL)`;
    await sql`CREATE TABLE IF NOT EXISTS notifications (id SERIAL PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), type TEXT NOT NULL, actor_id TEXT, clue_id TEXT, clue_word TEXT, message TEXT, created_at BIGINT NOT NULL, read BOOLEAN DEFAULT false)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, read)`;
    await sql`CREATE TABLE IF NOT EXISTS profile_comments (id SERIAL PRIMARY KEY, profile_user_id TEXT NOT NULL REFERENCES users(id), author_id TEXT NOT NULL REFERENCES users(id), content TEXT NOT NULL, created_at BIGINT NOT NULL)`;
    await sql`UPDATE users SET password = '1242', is_admin = true WHERE id = 'tushkan'`;
    res.json({ ok: true, message: 'Tables created/updated successfully' });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: message });
  }
}
