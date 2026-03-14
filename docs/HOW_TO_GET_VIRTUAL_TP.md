# Как найти/установить виртуальный Teach Pendant для Estun ERC3-C1

## 📍 Где искать

### 1. Проверить ПК с контроллером робота

На компьютере, который управляет роботом (контроллер ERC3-C1):

```
C:\runtime\TP-For-PC\
```

Или в других местах:
```
C:\Estun\TP-For-PC\
C:\Program Files\Estun\TeachPendant\
D:\runtime\TP-For-PC\
```

### 2. Проверить установочные диски

Если у вас есть диски от робота:
- Диск с ПО для контроллера
- Диск с утилитами Estun
- USB-флешка с ПО (могла идти в комплекте)

### 3. Запросить у производителя

**Контакты Estun (Китай):**
- Email: `export@estun.com`
- Сайт: `www.estun.com`
- Телефон: `+86-25-52122008`

**Техподдержка Estun (Россия/СНГ):**
- Найти через официального дилера
- Или через контакт, который был при покупке робота

---

## 📝 Что запросить у производителя

### Шаблон письма (на английском):

```
Subject: Request for Virtual Teach Pendant Software - Estun ERC3-C1

Dear Estun Support,

We have an Estun ERC3-C1 robot controller and need the Virtual Teach Pendant 
software for PC.

According to the manufacturer representative, the software should be located at:
C:/runtime/TP-For-PC/

However, this folder is missing on our system.

Please provide:
1. Virtual Teach Pendant installer (TP-For-PC)
2. Virtual Controller software (if separate)
3. Installation instructions
4. License requirements (if any)

Robot Details:
- Model: ER Series (please specify your robot model)
- Controller: ERC3-C1
- Serial Number: [your serial number]
- Purchase Date: [your purchase date]

Thank you for your assistance.

Best regards,
[Your Name]
[Company Name]
[Contact Information]
```

### Шаблон письма (на русском):

```
Тема: Запрос ПО Виртуальный Teach Pendant - Estun ERC3-C1

Уважаемая техподдержка Estun,

У нас есть контроллер робота Estun ERC3-C1. Нам необходимо ПО 
Виртуального Teach Pendant для ПК.

По информации от представителя производителя, ПО должно находиться по адресу:
C:/runtime/TP-For-PC/

Однако эта папка отсутствует на нашей системе.

Просим предоставить:
1. Установщик Virtual Teach Pendant (TP-For-PC)
2. Виртуальный контроллер (если отдельно)
3. Инструкцию по установке
4. Требования к лицензии (если есть)

Данные робота:
- Модель: [ваша модель робота]
- Контроллер: ERC3-C1
- Серийный номер: [ваш серийный номер]
- Дата покупки: [дата покупки]

Спасибо за помощь.

С уважением,
[Ваше имя]
[Компания]
[Контакты]
```

---

## 🔍 Альтернативные варианты

### 1. Использовать физический Teach Pendant

Если виртуальный найти не удастся:

- **Физический пульт** уже есть у робота
- Можно настраивать режимы через него
- Наш код работает независимо от типа пульта

**Что нужно сделать на физическом пульте:**
1. Переключить ключ в **REMOTE**
2. Меню → Настройки → Связь
3. Включить **TCP Server** (порт 1502)
4. Включить **External Control**

### 2. Подключиться напрямую к контроллеру

Наш код может работать **без Teach Pendant**:

```
Контроллер робота (192.168.6.68:1502)
         ↓
    Наш код (Modbus TCP)
         ↓
    Управление роботом
```

**Teach Pendant нужен только для:**
- Первичной настройки режимов
- Переключения в REMOTE
- Сброса ошибок

**После настройки** — код работает самостоятельно.

---

## 📋 Чек-лист для развёртывания

### На ПК с роботом:

- [ ] `git pull` — получить код
- [ ] `npm install` — установить зависимости
- [ ] Отредактировать `.env`:
  ```
  VITE_ROBOT_IP=192.168.6.68
  VITE_ROBOT_PORT=1502
  ```
- [ ] `npm start` — запустить

### Проверка подключения:

- [ ] Пинг контроллера: `ping 192.168.6.68`
- [ ] Проверка порта: `telnet 192.168.6.68 1502`
- [ ] Открыть браузер: `http://localhost:5173`
- [ ] Нажать "Read Diagnostics"
- [ ] Проверить статус робота

### Настройка робота (через Teach Pendant):

- [ ] Переключить в REMOTE режим
- [ ] Включить External Control
- [ ] Включить TCP Server (порт 1502)
- [ ] Сбросить ошибки (если есть)

---

## 🆘 Если возникли проблемы

### "Not connected" в приложении

1. Проверить, запущен ли контроллер
2. Проверить сеть: `ping 192.168.6.68`
3. Проверить порт: `telnet 192.168.6.68 1502`
4. Проверить firewall на ПК

### "Not in Remote Mode"

1. Использовать Teach Pendant (физический или виртуальный)
2. Переключить ключ в REMOTE
3. Включить External Control в меню

### "Error Active"

1. Посмотреть код ошибки на Teach Pendant
2. Сбросить ошибку через пульт
3. Или отправить команду: `40052 = 0x10`

---

## 📞 Контакты для поддержки

**Estun Automation Co., Ltd.**
- 🌐 www.estun.com
- 📧 export@estun.com
- 📞 +86-25-52122008

**Estun Russia (если есть):**
- Найти через дилера
- Или через главного инженера предприятия

---

**Дата:** 2026-03-08
**Версия:** 1.0
