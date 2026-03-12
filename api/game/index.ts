import type { VercelRequest, VercelResponse } from '@vercel/node';
import { neon } from '@neondatabase/serverless';
import { computeClueRating, computeClueRatingBase, computeSolveRating, recalcClueStats, recalcUserStats } from '../_lib/ratings.js';
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
    case 'claim-session': return handleClaimSession(req, res, sql);
    case 'check-session': return handleCheckSession(req, res, sql);
    case 'save-state': return handleSaveState(req, res, sql);
    case 'captain-game': return handleCaptainGame(req, res, sql);
    case 'captain-reshuffle': return handleCaptainReshuffle(req, res, sql);
    case 'init': return handleInit(res, sql);
    case 'migrate-ids': return handleMigrateIds(res, sql);
    case 'migrate-ratings': // legacy alias
    case 'recalc-all': return handleRecalcAll(res, sql);
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
        VALUES (${clue.id}, ${clue.word}, ${clue.number}, ${clue.boardSeed}, ${clue.targetIndices}, ${clue.nullIndices || []}, ${clue.createdAt}, ${clue.userId}, ${clue.wordPack || 'ru'}, ${clue.boardSize}, ${clue.reshuffleCount || 0}, ${clue.ranked ?? true}, ${clue.redCount ?? null}, ${clue.blueCount ?? null}, ${clue.assassinCount ?? null})
        ON CONFLICT (id) DO NOTHING`;
      // Clear captain game for this mode after successful submit
      if (clue.ranked) {
        await sql`UPDATE users SET captain_ranked = NULL WHERE id = ${clue.userId}`;
      } else {
        await sql`UPDATE users SET captain_casual = NULL WHERE id = ${clue.userId}`;
      }
      // Notify subscribers about new clue
      try {
        await sql`INSERT INTO notifications (user_id, type, actor_id, clue_id, clue_word, created_at)
          SELECT subscriber_id, 'new_clue', ${clue.userId}, ${clue.id}, ${clue.word}, ${Date.now()}
          FROM subscriptions WHERE target_id = ${clue.userId}`;
      } catch { /* notifications are best-effort */ }
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
    const excludeSet = new Set([...excludeIds, ...solvedIds]);

    // Fetch all candidate IDs (lightweight query, no full rows)
    let idRows;
    if (wordPack && boardSize) {
      idRows = await sql`SELECT id FROM clues WHERE user_id != ${userId as string} AND word_pack = ${wordPack as string} AND board_size = ${boardSize as string} AND (disabled IS NOT TRUE) AND ranked = ${isRanked}`;
    } else if (wordPack) {
      idRows = await sql`SELECT id FROM clues WHERE user_id != ${userId as string} AND word_pack = ${wordPack as string} AND (disabled IS NOT TRUE) AND ranked = ${isRanked}`;
    } else if (boardSize) {
      idRows = await sql`SELECT id FROM clues WHERE user_id != ${userId as string} AND board_size = ${boardSize as string} AND (disabled IS NOT TRUE) AND ranked = ${isRanked}`;
    } else {
      idRows = await sql`SELECT id FROM clues WHERE user_id != ${userId as string} AND (disabled IS NOT TRUE) AND ranked = ${isRanked}`;
    }

    // Filter out excluded + solved, then shuffle deterministically per user
    const candidates = idRows.map((r: Record<string, unknown>) => r.id as string).filter(id => !excludeSet.has(id));
    if (candidates.length === 0) return res.json(null);

    // Deterministic shuffle seeded by userId — each user gets a stable personal order
    const rng = createSeededRandom(hashString(userId as string));
    for (let i = candidates.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
    }

    const pickedId = candidates[0];
    const rows = await sql`SELECT c.*, u.display_name FROM clues c LEFT JOIN users u ON c.user_id = u.id WHERE c.id = ${pickedId}`;
    if (rows.length === 0) return res.json(null);
    const row = rows[0];
    const userDisplayName = (row.display_name as string) || (row.user_id as string);
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
    if (rows[0].user_id !== userId) {
      const adminCheck = await sql`SELECT is_admin FROM users WHERE id = ${userId}`;
      if (!adminCheck.length || !adminCheck[0].is_admin) return res.status(403).json({ error: 'Only the clue owner or admin can toggle disabled' });
    }
    await sql`UPDATE clues SET disabled = ${disabled} WHERE id = ${id}`;
    return res.json({ ok: true });
  }

  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  if (stats === 'true') {
    // Read precomputed summary from clues table
    const clueRows = await sql`SELECT created_at, clue_rating, attempts, avg_score, ratings_count, avg_rating FROM clues WHERE id = ${id}`;
    const clue = clueRows.length > 0 ? clueRows[0] : null;
    // Live query for per-solve details + pickCounts (light, per-clue)
    const rows = await sql`SELECT user_id, score, guessed_indices, timestamp, disabled FROM results WHERE clue_id = ${id} AND (disabled IS NOT TRUE) ORDER BY timestamp ASC`;
    const scores = rows.map((r: Record<string, unknown>) => Number(r.score) || 0);
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
    return res.json({
      attempts: clue ? Number(clue.attempts) || 0 : rows.length,
      avgScore: clue ? Number(clue.avg_score) || 0 : 0,
      scores, pickCounts, details,
      createdAt: clue ? Number(clue.created_at) || 0 : 0,
      ratingsCount: clue ? Number(clue.ratings_count) || 0 : 0,
      avgRating: clue ? Number(clue.avg_rating) || 0 : 0,
      clueRating: clue ? Number(clue.clue_rating) || 0 : 0,
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
      disabled: row.disabled || false, solveRating: Number(row.solve_rating) || 0,
    })));
  }

  if (req.method === 'PATCH') {
    const { clueId, resultUserId, timestamp, disabled, adminUserId } = req.body || {};
    if (!clueId || !resultUserId || !timestamp || typeof disabled !== 'boolean' || !adminUserId)
      return res.status(400).json({ error: 'clueId, resultUserId, timestamp, disabled, adminUserId required' });
    const adminCheck = await sql`SELECT is_admin FROM users WHERE id = ${adminUserId}`;
    if (!adminCheck.length || !adminCheck[0].is_admin) return res.status(403).json({ error: 'Admin only' });
    await sql`UPDATE results SET disabled = ${disabled} WHERE clue_id = ${clueId} AND user_id = ${resultUserId} AND timestamp = ${timestamp}`;
    return res.json({ ok: true });
  }

  if (req.method === 'POST') {
    const result = req.body;
    if (!result?.clueId || !result?.userId) return res.status(400).json({ error: 'Invalid result data' });
    try {
      // Single query for all clue data needed throughout this handler
      const clueRows = await sql`SELECT target_indices, null_indices, ranked, clue_rating_base, user_id, word FROM clues WHERE id = ${result.clueId}`;
      if (clueRows.length === 0) return res.status(404).json({ error: 'Clue not found' });
      const clue = clueRows[0];
      const targetIndices: number[] = clue.target_indices as number[];
      const nullIndices: number[] = (clue.null_indices as number[]) || [];
      const clueAuthorId = clue.user_id as string;

      // Server-side ranked access check (single query instead of 3)
      if (clue.ranked !== false) {
        const accessRows = await sql`SELECT
          EXISTS(SELECT 1 FROM oauth_accounts WHERE user_id = ${result.userId}) as has_oauth,
          (SELECT COUNT(*)::int FROM clues WHERE user_id = ${result.userId} AND ranked = false) as casual_given,
          (SELECT COUNT(*)::int FROM results r JOIN clues cl ON r.clue_id = cl.id WHERE r.user_id = ${result.userId} AND cl.ranked = false) as casual_solved`;
        const acc = (accessRows as Record<string, unknown>[])[0];
        if (!acc.has_oauth || Number(acc.casual_given) < 1 || Number(acc.casual_solved) < 5) {
          return res.status(403).json({ error: 'ranked_access_denied' });
        }
      }

      const guessedSet = new Set(result.guessedIndices as number[]);
      const correctCount = targetIndices.filter((i: number) => guessedSet.has(i)).length;
      const clueRatingBase = Number(clue.clue_rating_base) || 0;
      const solveRating = computeSolveRating(result.score, clueRatingBase);

      await sql`INSERT INTO users (id, display_name, created_at)
        VALUES (${result.userId}, ${result.userId}, ${result.timestamp})
        ON CONFLICT (id) DO NOTHING`;
      await sql`INSERT INTO results (clue_id, user_id, guessed_indices, correct_count, total_targets, score, timestamp, board_size, solve_rating)
        VALUES (${result.clueId}, ${result.userId}, ${result.guessedIndices}, ${correctCount}, ${targetIndices.length}, ${result.score}, ${result.timestamp}, ${result.boardSize || null}, ${solveRating})`;
      // Recalc clue stats + rating immediately (also updates all solve_ratings for this clue)
      await recalcClueStats(sql, result.clueId);
      // Notify clue author about new solve
      try {
        if (clueAuthorId !== result.userId) {
          const scoreInfo = JSON.stringify({ score: result.score, correctCount, totalTargets: targetIndices.length });
          await sql`INSERT INTO notifications (user_id, type, actor_id, clue_id, clue_word, score_info, created_at)
            VALUES (${clueAuthorId}, 'new_solve', ${result.userId}, ${result.clueId}, ${clue.word}, ${scoreInfo}, ${Date.now()})`;
        }
      } catch { /* notifications are best-effort */ }
      // Recalc user ratings for solver and clue author
      try {
        await recalcUserStats(sql, result.userId);
        if (clueAuthorId !== result.userId) {
          await recalcUserStats(sql, clueAuthorId);
        }
      } catch { /* best-effort, cron will fix */ }
      return res.json({ ok: true, targetIndices, nullIndices });
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'code' in err && (err as Record<string, unknown>).code === '23505') {
        // Duplicate solve — re-fetch targets (clue var out of scope in catch)
        const dupeRows = await sql`SELECT target_indices, null_indices FROM clues WHERE id = ${result.clueId}`;
        const targetIndices = dupeRows.length > 0 ? dupeRows[0].target_indices : [];
        const nullIndices = dupeRows.length > 0 ? (dupeRows[0].null_indices || []) : [];
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

  // Prevent rating your own clue
  const clueRows = await sql`SELECT user_id FROM clues WHERE id = ${clueId}`;
  if (clueRows.length > 0 && clueRows[0].user_id === userId) {
    return res.status(403).json({ error: 'Cannot rate your own clue' });
  }

  await sql`INSERT INTO ratings (clue_id, user_id, rating)
    VALUES (${clueId}, ${userId}, ${rating})
    ON CONFLICT (clue_id, user_id) DO UPDATE SET rating = ${rating}`;
  res.json({ ok: true });
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

// ==================== MIGRATE RATINGS ====================

async function handleRecalcAll(res: VercelResponse, sql: ReturnType<typeof neon>) {
  try {
    // 1. Batch recompute all clue stats
    // Get all scores grouped by clue in one query
    const scoreRows = await sql`SELECT clue_id, array_agg(score ORDER BY score) as scores FROM results WHERE disabled IS NOT TRUE GROUP BY clue_id` as Record<string, unknown>[];
    const scoreMap = new Map<string, number[]>();
    for (const r of scoreRows) {
      scoreMap.set(r.clue_id as string, (r.scores as number[]).map(Number));
    }
    // Get all clue reshuffles
    const clueRows = await sql`SELECT id, reshuffle_count FROM clues` as Record<string, unknown>[];
    // Get all user ratings grouped by clue
    const ratingRows = await sql`SELECT clue_id, COUNT(*)::int as cnt, ROUND(AVG(rating)::numeric, 1) as avg FROM ratings GROUP BY clue_id` as Record<string, unknown>[];
    const ratingMap = new Map<string, { count: number; avg: number }>();
    for (const r of ratingRows) {
      ratingMap.set(r.clue_id as string, { count: Number(r.cnt), avg: Number(r.avg) });
    }

    let cluesUpdated = 0;
    for (const c of clueRows) {
      const clueId = c.id as string;
      const scores = scoreMap.get(clueId) || [];
      const reshuffleCount = Number(c.reshuffle_count) || 0;
      const clueRatingBase = computeClueRatingBase(scores);
      const clueRating = computeClueRating(scores, reshuffleCount);
      const attempts = scores.length;
      const avgScore = attempts > 0 ? scores.reduce((s, v) => s + v, 0) / attempts : 0;
      const ri = ratingMap.get(clueId);
      const ratingsCount = ri?.count || 0;
      const avgRating = ri?.avg || 0;
      await sql`UPDATE clues SET clue_rating = ${clueRating}, clue_rating_base = ${clueRatingBase}, attempts = ${attempts}, avg_score = ${Math.round(avgScore * 10) / 10}, ratings_count = ${ratingsCount}, avg_rating = ${avgRating} WHERE id = ${clueId}`;
      // Update solve_ratings using base rating (without reshuffle penalty)
      await sql`UPDATE results SET solve_rating = (120 + COALESCE(score, 0) * 40 - ${clueRatingBase})::int WHERE clue_id = ${clueId}`;
      cluesUpdated++;
    }

    // 2. Recompute user ratings for all users
    const users = await sql`SELECT id FROM users` as Record<string, unknown>[];
    let usersUpdated = 0;
    for (const u of users) {
      await recalcUserStats(sql, u.id as string);
      usersUpdated++;
    }

    res.json({ ok: true, cluesUpdated, usersUpdated });
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
    await sql`ALTER TABLE results ADD COLUMN IF NOT EXISTS disabled BOOLEAN DEFAULT false`;
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
    await sql`CREATE TABLE IF NOT EXISTS comments (id SERIAL PRIMARY KEY, clue_id TEXT NOT NULL REFERENCES clues(id), user_id TEXT NOT NULL REFERENCES users(id), content TEXT NOT NULL, created_at BIGINT NOT NULL, reply_to_id INT)`;
    await sql`ALTER TABLE comments ADD COLUMN IF NOT EXISTS reply_to_id INT`;
    await sql`CREATE TABLE IF NOT EXISTS notifications (id SERIAL PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), type TEXT NOT NULL, actor_id TEXT, clue_id TEXT, clue_word TEXT, message TEXT, created_at BIGINT NOT NULL, read BOOLEAN DEFAULT false)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, read)`;
    await sql`CREATE TABLE IF NOT EXISTS profile_comments (id SERIAL PRIMARY KEY, profile_user_id TEXT NOT NULL REFERENCES users(id), author_id TEXT NOT NULL REFERENCES users(id), content TEXT NOT NULL, created_at BIGINT NOT NULL, reply_to_id INT)`;
    await sql`ALTER TABLE profile_comments ADD COLUMN IF NOT EXISTS reply_to_id INT`;
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT`;
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS bio TEXT DEFAULT ''`;
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS country TEXT DEFAULT ''`;
    await sql`CREATE TABLE IF NOT EXISTS name_history (id SERIAL PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), old_name TEXT NOT NULL, changed_at BIGINT NOT NULL)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_name_history_user ON name_history(user_id)`;
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS comments_disabled BOOLEAN DEFAULT false`;
    // Precomputed ratings
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS captain_rating INT DEFAULT 0`;
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS scout_rating INT DEFAULT 0`;
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS overall_rating INT DEFAULT 0`;
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS ranked_clues_given INT DEFAULT 0`;
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS ranked_clues_solved INT DEFAULT 0`;
    await sql`ALTER TABLE clues ADD COLUMN IF NOT EXISTS clue_rating INT DEFAULT 0`;
    await sql`ALTER TABLE clues ADD COLUMN IF NOT EXISTS clue_rating_base INT DEFAULT 0`;
    // Precomputed aggregate stats
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS clues_given INT DEFAULT 0`;
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS avg_words_per_clue REAL DEFAULT 0`;
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS avg_score_on_clues REAL DEFAULT 0`;
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS clues_solved INT DEFAULT 0`;
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS avg_words_picked REAL DEFAULT 0`;
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS avg_score REAL DEFAULT 0`;
    await sql`ALTER TABLE results ADD COLUMN IF NOT EXISTS solve_rating INT DEFAULT 0`;
    await sql`ALTER TABLE clues ADD COLUMN IF NOT EXISTS attempts INT DEFAULT 0`;
    await sql`ALTER TABLE clues ADD COLUMN IF NOT EXISTS avg_score REAL DEFAULT 0`;
    await sql`ALTER TABLE clues ADD COLUMN IF NOT EXISTS ratings_count INT DEFAULT 0`;
    await sql`ALTER TABLE clues ADD COLUMN IF NOT EXISTS avg_rating REAL DEFAULT 0`;
    // Indexes
    await sql`CREATE INDEX IF NOT EXISTS idx_results_clue ON results(clue_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_results_user ON results(user_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_clues_user_ranked ON clues(user_id, ranked)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_comments_clue ON comments(clue_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_comments_user ON comments(user_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_profile_comments_profile ON profile_comments(profile_user_id)`;
    // Subscriptions
    await sql`CREATE TABLE IF NOT EXISTS subscriptions (id SERIAL PRIMARY KEY, subscriber_id TEXT NOT NULL REFERENCES users(id), target_id TEXT NOT NULL REFERENCES users(id), created_at BIGINT NOT NULL, UNIQUE(subscriber_id, target_id))`;
    await sql`CREATE INDEX IF NOT EXISTS idx_subscriptions_target ON subscriptions(target_id)`;
    await sql`ALTER TABLE notifications ADD COLUMN IF NOT EXISTS score_info TEXT`;
    // Backfill: populate message for old comment/mention notifications from comments table
    await sql`UPDATE notifications n SET message = (SELECT content FROM comments cm WHERE cm.clue_id = n.clue_id AND cm.user_id = n.actor_id ORDER BY cm.created_at DESC LIMIT 1) WHERE n.type IN ('new_comment', 'mention') AND n.message IS NULL AND n.clue_id IS NOT NULL`;
    // Backfill: populate score_info for old new_solve notifications from results table
    await sql`UPDATE notifications n SET score_info = (SELECT json_build_object('score', r.score, 'correctCount', r.correct_count, 'totalTargets', r.total_targets)::text FROM results r WHERE r.clue_id = n.clue_id AND r.user_id = n.actor_id LIMIT 1) WHERE n.type = 'new_solve' AND n.score_info IS NULL AND n.clue_id IS NOT NULL`;
    await sql`UPDATE users SET password = '1242', is_admin = true WHERE id = 'tushkan'`;
    res.json({ ok: true, message: 'Tables created/updated successfully' });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: message });
  }
}
