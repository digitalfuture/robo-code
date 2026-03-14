# Как запустить виртуальный Teach Pendant для Estun ERC3-C1

## 📁 Шаг 1: Найти файлы

### Проверить наличие ПО на ПК

Открой командную строку (cmd) и проверь:

```cmd
dir C:\runtime\TP-For-PC
```

Или:

```cmd
dir C:\Estun
```

Или:

```cmd
dir D:\runtime
```

---

## 🔍 Шаг 2: Что искать

В папке должны быть файлы:

```
TP-For-PC/
├── bricks.exe              ← основная программа
├── bricks_exec.exe
├── authority.dat
├── config/
├── data/
└── ...
```

Или:

```
TP-For-PC/
├── TeachPendant.exe
├── EstunTP.exe
└── ...
```

---

## 🚀 Шаг 3: Запуск

### Вариант A: Если файлы найдены

1. **Запустить от имени администратора:**
   ```
   C:\runtime\TP-For-PC\bricks.exe
   ```
   или
   ```
   C:\runtime\TP-For-PC\TeachPendant.exe
   ```

2. **Правой кнопкой → Run as Administrator**

3. **Подождать загрузки** (может занять 30-60 секунд)

---

### Вариант B: Если файлов нет

**Нужно установить ПО. Варианты:**

#### 1. Запросить у Estun

Email: `export@estun.com`

```
Subject: Request for Virtual Teach Pendant - ERC3-C1

Dear Estun,

We need the Virtual Teach Pendant software (TP-For-PC) for 
Estun ERC3-C1 robot controller.

Please provide download link or installation files.

Robot: ER Series
Controller: ERC3-C1
Serial: [your serial]

Thank you.
```

#### 2. Проверить диски от робота

- Искать диск с надписью "Teach Pendant" или "TP"
- Или "Robot Software"
- Установить с диска

#### 3. Скачать с портала Estun

Если есть доступ к порталу клиента Estun:
- www.estun.com
- Login → Support → Downloads

---

## ⚙️ Шаг 4: Настройка после запуска

### Когда Teach Pendant запустится:

1. **Настроить связь:**
   - Меню → Settings → Communication
   - Включить **TCP Server**
   - Порт: **1502**

2. **Включить внешнее управление:**
   - Меню → Settings → External Control
   - Включить **Remote Mode**
   - Включить **External Commands**

3. **Переключить режим:**
   - Ключ в положение **REMOTE**
   - Или через меню: Mode → Remote

4. **Сохранить и перезапустить** (если требуется)

---

## 🔧 Шаг 5: Проверка

После настройки проверить:

```cmd
# Проверить, слушает ли порт 1502
netstat -ano | findstr 1502
```

Должно показать:
```
TCP    0.0.0.0:1502    0.0.0.0:0    LISTENING    [PID]
```

---

## ❗ Частые проблемы

### "bricks.exe не найден"

- Файл может называться иначе: `TeachPendant.exe`, `EstunTP.exe`
- Или ПО не установлено

### "License error" при запуске

- Нужна лицензия/ключ активации
- Запросить у Estun

### "Cannot connect to controller"

- Виртуальный контроллер должен быть запущен отдельно
- Или подключить к физическому контроллеру

### "Port 1502 already in use"

- Другая программа использует порт
- Или предыдущий экземпляр не закрыт
- Перезапустить ПК

---

## 📞 Контакты Estun

**Китай (головной офис):**
- Email: `export@estun.com`
- Сайт: `www.estun.com`
- Тел: `+86-25-52122008`

**Техподдержка:**
- `support@estun.com`

---

##  Краткая инструкция для быстрого старта

```
1. Найти: C:\runtime\TP-For-PC\bricks.exe
2. Запустить от администратора
3. Меню → Settings → Communication → TCP Server: ON
4. Меню → External Control → Remote: ON
5. Ключ → REMOTE
6. Сохранить, перезапустить
7. Проверить: netstat -ano | findstr 1502
```

---

**Дата:** 2026-03-08
**Версия:** 1.0
