import fs from 'fs';
import path from 'path';

const exchanges = ['bitget', 'bybit', 'okx'];
const ACCOUNTS_PER_EXCHANGE = 3;
const POSITIONS_PER_ACCOUNT = 20;
const HISTORY_PER_ACCOUNT = 25;
const ORDERS_PER_ACCOUNT = 25;

const coins = ['USDT', 'USDC', 'BTC', 'ETH', 'SOL', 'LINK'];
const symbols = [
  'BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'LINKUSDT',
  'BTCUSDC', 'ETHUSDC', 'SOLUSDC', 'LINKUSDC',
  'BTCUSD', 'ETHUSD', 'SOLUSD', 'LINKUSD'
];
const sides = ['long', 'short'];
const marginModes = ['isolated', 'cross'];

const randomItem = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randomNum = (min, max) => min + Math.random() * (max - min);
const randomInt = (min, max) => Math.floor(randomNum(min, max));

function generate() {
  const accounts = [];
  const balances = [];
  const positions = [];
  const history = [];
  const orders = [];

  let posIdCounter = 1;
  let histIdCounter = 1;
  let balIdCounter = 1;
  let orderIdCounter = 1;

  exchanges.forEach(exchange => {
    for (let i = 1; i <= ACCOUNTS_PER_EXCHANGE; i++) {
      const connectionId = `mocked-data-${exchange}-${i}`;
      const label = `Mock ${exchange.toUpperCase()} ${i}`;
      accounts.push({ connectionId, exchange, label });

      // Generate Balances
      const numBalances = randomInt(5, 10);
      for (let j = 0; j < numBalances; j++) {
        const ccy = coins[j % coins.length];
        const amount = ccy.includes('USD') ? randomNum(100, 50000) : randomNum(0.1, 100);
        const usdValue = ccy.includes('USD') ? amount : amount * randomNum(1, 100);
        
        balances.push({
          id: `bal-${balIdCounter++}`,
          connectionId,
          exchange,
          label,
          ccy,
          amount,
          usdValue
        });
      }

      // Generate Open Positions
      for (let j = 0; j < POSITIONS_PER_ACCOUNT; j++) {
        const symbol = randomItem(symbols);
        const isInverse = symbol.endsWith('USD');
        const ccy = isInverse ? symbol.replace('USD', '') : randomItem(['USDT', 'USDC']);
        
        let baseCoin = symbol;
        let quoteCoin = 'USD';
        if (symbol.endsWith('USDT')) { baseCoin = symbol.replace('USDT', ''); quoteCoin = 'USDT'; }
        else if (symbol.endsWith('USD')) { baseCoin = symbol.replace('USD', ''); quoteCoin = 'USD'; }

        const side = randomItem(sides);
        const entryPrice = randomNum(1, 60000);
        const markPrice = entryPrice * randomNum(0.8, 1.2);
        const size = randomNum(0.01, 100);
        const margin = (entryPrice * size) / randomInt(1, 100); // leverage 1-100
        const unrealizedPnl = (side === 'long' ? (markPrice - entryPrice) : (entryPrice - markPrice)) * size;
        const roe = (unrealizedPnl / margin) * 100;
        
        // Product types mapped per exchange for raw data realistic look
        let instType = 'USDT-FUTURES';
        if (exchange === 'bitget') instType = isInverse ? 'COIN-FUTURES' : randomItem(['USDT-FUTURES', 'USDC-FUTURES', 'SPOT']);
        else if (exchange === 'okx') instType = randomItem(['SWAP', 'FUTURES', 'MARGIN', 'SPOT', 'OPTION']);
        else if (exchange === 'bybit') instType = isInverse ? 'inverse' : randomItem(['linear', 'spot', 'option']);

        let instrumentType = 'PERP';
        if (instType === 'COIN-FUTURES' || instType === 'inverse' || (instType === 'SWAP' && !['USDT', 'USDC'].includes(ccy))) {
          instrumentType = 'INVERSE';
        } else if (instType === 'SPOT' || instType === 'MARGIN' || instType === 'spot') {
          instrumentType = 'SPOT';
        } else if (instType === 'OPTION' || instType === 'option') {
          instrumentType = 'OPTION';
        } else if (instType === 'FUTURES') {
          instrumentType = ['USDT', 'USDC'].includes(ccy) ? 'FUTURES' : 'INVERSE';
        }

        const realizedPnl = randomNum(-50, 50);
        const accumulatedFunding = randomNum(-10, 10).toString();
        const accumulatedTradingFee = randomNum(-5, 0).toString();
        const closedPnl = realizedPnl - parseFloat(accumulatedFunding) - parseFloat(accumulatedTradingFee);

        positions.push({
          id: `pos-${posIdCounter++}`,
          connectionId,
          exchange,
          label,
          symbol,
          baseCoin,
          quoteCoin,
          side,
          ccy,
          size,
          entryPrice,
          markPrice,
          unrealizedPnl,
          realizedPnl,
          closedPnl,
          leverage: Math.round((entryPrice * size) / margin),
          marginMode: randomItem(marginModes),
          margin,
          liquidationPrice: side === 'long' ? entryPrice * 0.8 : entryPrice * 1.2,
          breakEvenPrice: entryPrice * 1.001,
          roe,
          instrumentType,
          accumulatedFunding,
          accumulatedTradingFee,
          raw: {
            mockData: true,
            instType
          }
        });
      }

      // Generate History
      for (let j = 0; j < HISTORY_PER_ACCOUNT; j++) {
        const symbol = randomItem(symbols);
        
        let baseCoin = symbol;
        let quoteCoin = 'USD';
        if (symbol.endsWith('USDT')) { baseCoin = symbol.replace('USDT', ''); quoteCoin = 'USDT'; }
        else if (symbol.endsWith('USD')) { baseCoin = symbol.replace('USD', ''); quoteCoin = 'USD'; }

        const side = randomItem(sides);
        const entryPrice = randomNum(1, 60000);
        const closePrice = entryPrice * randomNum(0.8, 1.2);
        const size = randomNum(0.01, 100);
        const realizedPnl = (side === 'long' ? (closePrice - entryPrice) : (entryPrice - closePrice)) * size;
        const closeUpdateTime = Date.now() - randomNum(0, 30 * 24 * 60 * 60 * 1000); // within last 30 days
        const createdTime = closeUpdateTime - randomNum(3600000, 7 * 24 * 3600000); // 1 hour to 7 days before close
        
        let instType = 'USDT-FUTURES';
        const isInverseHistory = randomItem([true, false]);
        const ccyHistory = isInverseHistory ? symbol.replace('USD', '') : randomItem(['USDT', 'USDC']);

        if (exchange === 'bitget') instType = isInverseHistory ? 'COIN-FUTURES' : randomItem(['USDT-FUTURES', 'USDC-FUTURES', 'SPOT']);
        else if (exchange === 'okx') instType = randomItem(['SWAP', 'FUTURES', 'MARGIN', 'SPOT', 'OPTION']);
        else if (exchange === 'bybit') instType = isInverseHistory ? 'inverse' : randomItem(['linear', 'spot', 'option']);

        let instrumentType = 'PERP';
        if (instType === 'COIN-FUTURES' || instType === 'inverse' || (instType === 'SWAP' && !['USDT', 'USDC'].includes(ccyHistory))) {
          instrumentType = 'INVERSE';
        } else if (instType === 'SPOT' || instType === 'MARGIN' || instType === 'spot') {
          instrumentType = 'SPOT';
        } else if (instType === 'OPTION' || instType === 'option') {
          instrumentType = 'OPTION';
        } else if (instType === 'FUTURES') {
          instrumentType = ['USDT', 'USDC'].includes(ccyHistory) ? 'FUTURES' : 'INVERSE';
        }

        const fundingFee = randomNum(-10, 10);
        const tradingFee = randomNum(-5, 0);
        const closedPnl = realizedPnl - fundingFee - tradingFee;

        history.push({
          id: `hist-${histIdCounter++}`,
          connectionId,
          exchange,
          label,
          symbol,
          baseCoin,
          quoteCoin,
          side,
          realizedPnl,
          closedPnl,
          closeUpdateTime,
          createdTime,
          entryPrice,
          closePrice,
          size,
          ccy: ccyHistory,
          fundingFee,
          tradingFee,
          instrumentType,
          raw: {
            mockData: true,
            leverage: randomInt(1, 100),
            marginMode: randomItem(marginModes),
            instType
          }
        });
      }

      // Generate Orders (Open & Closed)
      for (let j = 0; j < ORDERS_PER_ACCOUNT; j++) {
        const symbol = randomItem(symbols);
        const isOpen = Math.random() > 0.5;
        const side = randomItem(['buy', 'sell']);
        
        let instType = 'USDT-FUTURES';
        const isInverseOrder = randomItem([true, false]);
        const ccyOrder = isInverseOrder ? symbol.replace('USD', '') : randomItem(['USDT', 'USDC']);

        if (exchange === 'bitget') instType = isInverseOrder ? 'COIN-FUTURES' : randomItem(['USDT-FUTURES', 'USDC-FUTURES', 'SPOT']);
        else if (exchange === 'okx') instType = randomItem(['SWAP', 'FUTURES', 'MARGIN', 'SPOT', 'OPTION']);
        else if (exchange === 'bybit') instType = isInverseOrder ? 'inverse' : randomItem(['linear', 'spot', 'option']);

        let instrumentType = 'PERP';
        if (instType === 'COIN-FUTURES' || instType === 'inverse' || (instType === 'SWAP' && !['USDT', 'USDC'].includes(ccyOrder))) {
          instrumentType = 'INVERSE';
        } else if (instType === 'SPOT' || instType === 'MARGIN' || instType === 'spot') {
          instrumentType = 'SPOT';
        } else if (instType === 'OPTION' || instType === 'option') {
          instrumentType = 'OPTION';
        } else if (instType === 'FUTURES') {
          instrumentType = ['USDT', 'USDC'].includes(ccyOrder) ? 'FUTURES' : 'INVERSE';
        }

        const price = randomNum(1, 60000);
        const avgPrice = isOpen ? 0 : price * randomNum(0.99, 1.01);
        const qty = randomNum(0.01, 100);
        const filledQty = isOpen ? 0 : qty;
        
        const nowMs = Date.now();
        const updatedTime = nowMs - randomNum(0, isOpen ? 10 * 24 * 60 * 60 * 1000 : 90 * 24 * 60 * 60 * 1000);
        const createdTime = updatedTime - randomNum(1000, 24 * 60 * 60 * 1000);
        
        orders.push({
          id: `ord-${orderIdCounter++}`,
          exchangeOrderId: `ext-ord-${orderIdCounter}`,
          connectionId,
          exchange,
          label, // although UnfiedOrder doesn't require label, adding it doesn't hurt, but wait UnifiedOrder doesn't have label, let's omit if not needed
          symbol,
          category: instrumentType,
          side,
          positionSide: randomItem(['long', 'short', 'net']),
          type: randomItem(['LIMIT', 'MARKET', 'TP', 'SL']),
          status: isOpen ? randomItem(['NEW', 'PARTIALLY_FILLED']) : randomItem(['FILLED', 'CANCELLED']),
          price,
          avgPrice,
          qty,
          filledQty,
          value: price * qty,
          triggerPrice: Math.random() > 0.8 ? price * randomNum(0.9, 1.1) : undefined,
          reduceOnly: Math.random() > 0.8,
          timeInForce: randomItem(['GTC', 'IOC', 'FOK']),
          createdTime,
          updatedTime,
          raw: { mockData: true }
        });
      }
    }
  });


  // Generate Funding Summaries
  const fundingSummaries = [];
  const bybitTransactions = [];
  let txIdCounter = 1;
  let summaryIdCounter = 1;

  exchanges.forEach(exchange => {
    for (let i = 1; i <= ACCOUNTS_PER_EXCHANGE; i++) {
      const connectionId = `mocked-data-${exchange}-${i}`;
      const label = `Mock ${exchange.toUpperCase()} ${i}`;

      for (let j = 0; j < 5; j++) {
        const symbol = randomItem(symbols);
        const instType = randomItem(['USDT-M', 'COIN-M']);
        const last12 = randomNum(-500, 500);
        const last6 = last12 * randomNum(0.3, 0.7);
        const last3 = last6 * randomNum(0.3, 0.7);
        const last1 = last3 * randomNum(0.3, 0.7);
        const current = last1 * randomNum(0.1, 0.9);
        const today = current * randomNum(0, 0.2);

        fundingSummaries.push({
          id: `${exchange}-${symbol}`,
          exchange,
          symbol,
          instrumentType: instType,
          last12MonthsFundingRate: exchange === 'bybit' ? last12.toFixed(8) : undefined,
          last6MonthsFundingRate: exchange === 'bybit' ? last6.toFixed(8) : undefined,
          last3MonthsFundingRate: last3.toFixed(8),
          lastMonthFundingRate: last1.toFixed(8),
          currentMonthFundingRate: current.toFixed(8),
          todayFundingRate: today.toFixed(8),
          lastFundingRate: (today * randomNum(0.1, 0.5)).toFixed(8),
          lastFundingTime: String(Date.now() - randomNum(0, 8 * 60 * 60 * 1000)),
          updatedAt: Date.now()
        });
      }

      if (exchange === 'bybit') {
        for (let j = 0; j < 20; j++) {
          const transTime = Date.now() - randomNum(0, 30 * 24 * 60 * 60 * 1000);
          bybitTransactions.push({
            id: `${connectionId}-raw-${txIdCounter}-${transTime}`,
            connectionId,
            exchange: 'bybit',
            label,
            rawId: `raw-${txIdCounter}`,
            symbol: randomItem(symbols),
            category: randomItem(['linear', 'inverse', 'spot']),
            side: randomItem(['Buy', 'Sell', 'None']),
            transactionTime: transTime,
            type: randomItem(['TRADE', 'SETTLEMENT', 'TRANSFER']),
            transSubType: '',
            qty: String(randomNum(0.1, 10)),
            size: String(randomNum(0.1, 10)),
            currency: randomItem(['USDT', 'USDC', 'BTC', 'ETH']),
            tradePrice: String(randomNum(100, 60000)),
            funding: String(randomNum(-10, 10)),
            fee: String(randomNum(-5, -0.1)),
            cashFlow: String(randomNum(-1000, 1000)),
            change: String(randomNum(-1000, 1000)),
            cashBalance: String(randomNum(1000, 20000)),
            feeRate: '0.0006',
            bonusChange: '0',
            tradeId: `trade-${txIdCounter}`,
            orderId: `order-${txIdCounter}`,
            orderLinkId: `my-order-${txIdCounter}`,
            raw: { mockData: true }
          });
          txIdCounter++;
        }
      }
    }
  });

    // Generate Bills (Deposits / Withdrawals)
  const bills = [];
  let billIdCounter = 1;
  const billTypes = ['deposit', 'withdrawal'];
  const billCurrencies = ['USDT', 'USDC', 'BTC', 'ETH'];
  
  exchanges.forEach(exchange => {
    for (let i = 1; i <= ACCOUNTS_PER_EXCHANGE; i++) {
      const connectionId = `mocked-data-${exchange}-${i}`;
      const label = `Mock ${exchange.toUpperCase()} ${i}`;
      const numBills = randomInt(3, 7);
      
      for (let j = 0; j < numBills; j++) {
        const type = randomItem(billTypes);
        const ccy = randomItem(billCurrencies);
        const amount = type === 'deposit' 
          ? (ccy.includes('USD') ? randomNum(500, 25000) : randomNum(0.05, 5))
          : (ccy.includes('USD') ? -randomNum(100, 10000) : -randomNum(0.01, 2));
        const timestamp = Date.now() - randomNum(0, 90 * 24 * 60 * 60 * 1000); // last 90 days
        
        bills.push({
          id: `bill-${billIdCounter++}`,
          connectionId,
          exchange,
          label,
          type,
          amount,
          ccy,
          timestamp,
          raw: { mockData: true }
        });
      }
    }
  });

  const outDir = path.join(process.cwd(), 'src', 'mock');
  fs.writeFileSync(path.join(outDir, 'accounts.json'), JSON.stringify(accounts, null, 2));
  fs.writeFileSync(path.join(outDir, 'balances.json'), JSON.stringify(balances, null, 2));
  fs.writeFileSync(path.join(outDir, 'positions.json'), JSON.stringify(positions, null, 2));
  fs.writeFileSync(path.join(outDir, 'history.json'), JSON.stringify(history, null, 2));
  fs.writeFileSync(path.join(outDir, 'orders.json'), JSON.stringify(orders, null, 2));
  fs.writeFileSync(path.join(outDir, 'bills.json'), JSON.stringify(bills, null, 2));
  fs.writeFileSync(path.join(outDir, 'funding.json'), JSON.stringify(fundingSummaries, null, 2));
  fs.writeFileSync(path.join(outDir, 'bybit-transactions.json'), JSON.stringify(bybitTransactions, null, 2));

  console.log('Mock files generated successfully.');
}

generate();
