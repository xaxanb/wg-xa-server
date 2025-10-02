import React from 'react';
import Table from '@material-ui/core/Table'; // 表格
import TableBody from '@material-ui/core/TableBody'; // 表格体
import TableCell from '@material-ui/core/TableCell'; // 表格单元格
import TableContainer from '@material-ui/core/TableContainer'; // 表格容器
import TableHead from '@material-ui/core/TableHead'; // 表格头部
import TableRow from '@material-ui/core/TableRow'; // 表格行
import Button from '@material-ui/core/Button'; // 按钮
import Typography from '@material-ui/core/Typography'; // 排版组件
import { observer } from 'mobx-react'; // MobX 观察者装饰器（使组件响应状态变化）
import { grpc } from '../../Api'; // gRPC 接口封装
import { lastSeen, lazy } from '../../Util'; // 工具方法：格式化“上次在线时间”、懒加载数据
import { Device } from '../../sdk/devices_pb'; // 设备相关的 Protobuf 类型定义
import { confirm } from '../../components/Present'; // 确认弹窗组件
import { AppState } from '../../AppState'; // 应用状态管理

// 被 observer 装饰，让组件能响应 MobX 状态变化
@observer
export class AllDevices extends React.Component {
  // 懒加载获取所有设备：异步请求 gRPC 接口，结果会缓存到 `this.devices.current`，支持刷新
  devices = lazy(async () => {
    const res = await grpc.devices.listAllDevices({});
    return res.items;
  });

  // 删除设备：先弹确认框，确认后调用 gRPC 接口删除，最后刷新设备列表
  deleteDevice = async (device: Device.AsObject) => {
    if (await confirm('你确定吗？')) {
      await grpc.devices.deleteDevice({
        name: device.name,
        owner: { value: device.owner },
      });
      await this.devices.refresh();
    }
  };

  render() {
    // 若设备数据还在加载，显示“加载中”
    if (!this.devices.current) {
      return <p>加载中...</p>;
    }

    const rows = this.devices.current; // 当前已加载的设备列表

    // 当满足两个条件时显示“认证提供者”列：
    // 1. 设备数量 ≥ 2；2. 存在设备的认证提供者与第一个设备不同
    const showProviderCol = rows.length >= 2 && rows.some((r) => r.ownerProvider !== rows[0].ownerProvider);

    return (
      <div style={{ display: 'grid', gridGap: 25, gridAutoFlow: 'row' }}>
        {/* 标题：设备 */}
        <Typography variant="h5" component="h5">
          设备
        </Typography>
        <TableContainer>
          <Table stickyHeader> {/* stickyHeader 使表头在滚动时固定 */}
            <TableHead>
              <TableRow>
                <TableCell>所有者</TableCell>
                {showProviderCol && <TableCell>认证提供者</TableCell>}
                <TableCell>设备</TableCell>
                <TableCell>已连接</TableCell>
                <TableCell>上次在线</TableCell>
                <TableCell>操作</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {/* 遍历所有设备，渲染每行数据 */}
              {rows.map((row, i) => (
                <TableRow key={i}>
                  <TableCell component="th" scope="row">
                    {/* 优先显示所有者名称/邮箱，否则显示所有者标识 */}
                    {row.ownerName || row.ownerEmail || row.owner}
                  </TableCell>
                  {showProviderCol && <TableCell>{row.ownerProvider}</TableCell>}
                  <TableCell>{row.name}</TableCell>
                  <TableCell>{row.connected ? '是' : '否'}</TableCell>
                  <TableCell>{lastSeen(row.lastHandshakeTime)}</TableCell>
                  <TableCell>
                    {/* 点击“删除”按钮，触发删除设备逻辑 */}
                    <Button variant="outlined" color="secondary" onClick={() => this.deleteDevice(row)}>
                      删除
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        {/* 标题：服务器信息 */}
        <Typography variant="h5" component="h5">
          服务器信息
        </Typography>
        <code>
          <pre>
            {/* 以格式化的 JSON 显示应用状态信息 */}
            {JSON.stringify(AppState.info, null, 2)}
          </pre>
        </code>
      </div>
    );
  }
}
